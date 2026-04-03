/**
 * Flexible execution engine: registers, queues, and executes tasks by type.
 * Adds: per-task timeouts, optional context, basic concurrency for parallel runs,
 * durations in results, and small registry utilities.
 */
type Handler = (params: any, context?: any) => Promise<any>

export interface ExecutionTask {
  id: string
  type: string
  params: any
  /** Optional per-task context passed to the handler */
  context?: any
  /** Optional timeout override for this task (ms) */
  timeoutMs?: number
}

export interface ExecutionResult {
  id: string
  result?: any
  error?: string
  executedAt: number
  durationMs: number
}

export interface ExecutionEngineOptions {
  /** Default timeout for tasks (ms). Disabled if <= 0. Default: 0 (no timeout). */
  defaultTimeoutMs?: number
  /** Max concurrent tasks for runParallel. Default: 4 */
  concurrency?: number
}

class Semaphore {
  private active = 0
  private queue: Array<() => void> = []
  constructor(private readonly max: number) {}
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryTake = () => {
        if (this.active < this.max) {
          this.active++
          resolve(() => this.release())
        } else {
          this.queue.push(tryTake)
        }
      }
      tryTake()
    })
  }
  private release() {
    this.active--
    const next = this.queue.shift()
    if (next) next()
  }
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: ExecutionTask[] = []
  private readonly defaultTimeoutMs: number
  private readonly concurrency: number

  constructor(opts: ExecutionEngineOptions = {}) {
    this.defaultTimeoutMs = Math.max(0, opts.defaultTimeoutMs ?? 0)
    this.concurrency = Math.max(1, opts.concurrency ?? 4)
  }

  /**
   * Register a handler function for a given task type.
   * If a handler exists, it is overwritten only when overwrite = true.
   */
  register(type: string, handler: Handler, overwrite = false): void {
    if (!overwrite && this.handlers[type]) {
      throw new Error(`Handler already registered for type: ${type}`)
    }
    if (typeof handler !== "function") {
      throw new Error(`Handler for type "${type}" must be a function`)
    }
    this.handlers[type] = handler
  }

  /**
   * Add a task to the queue for later execution.
   */
  enqueue(id: string, type: string, params: any, options?: { context?: any; timeoutMs?: number }): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, context: options?.context, timeoutMs: options?.timeoutMs })
  }

  /**
   * Execute all queued tasks sequentially.
   */
  async runAll(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      results.push(await this.executeTask(task))
    }
    return results
  }

  /**
   * Execute all queued tasks in parallel with a concurrency limit.
   * Clears the queue when done.
   */
  async runParallel(): Promise<ExecutionResult[]> {
    const sem = new Semaphore(this.concurrency)
    const tasks = this.queue.splice(0)
    const runs = tasks.map(async (t) => {
      const release = await sem.acquire()
      try {
        return await this.executeTask(t)
      } finally {
        release()
      }
    })
    return Promise.all(runs)
  }

  /**
   * Clear all queued tasks without executing.
   */
  clearQueue(): void {
    this.queue = []
  }

  /**
   * List currently queued tasks.
   */
  listQueue(): ExecutionTask[] {
    return [...this.queue]
  }

  /**
   * Introspection helpers.
   */
  hasType(type: string): boolean {
    return !!this.handlers[type]
  }
  size(): number {
    return this.queue.length
  }

  /** Internal: execute a single task with timing + timeout */
  private async executeTask(task: ExecutionTask): Promise<ExecutionResult> {
    const start = Date.now()
    const handler = this.handlers[task.type]
    const timeoutMs = task.timeoutMs ?? this.defaultTimeoutMs

    const run = handler(task.params, task.context)

    try {
      const data = await (timeoutMs > 0 ? withTimeout(run, timeoutMs) : run)
      return { id: task.id, result: data, executedAt: start, durationMs: Date.now() - start }
    } catch (err: any) {
      return {
        id: task.id,
        error: err?.message ?? String(err),
        executedAt: start,
        durationMs: Date.now() - start,
      }
    }
  }
}

/** Promise timeout wrapper (does not cancel the underlying work) */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Task timed out after ${ms} ms`)), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}
