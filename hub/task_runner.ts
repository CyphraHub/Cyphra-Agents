import { execCommand, tryExecCommand } from "./exec_command"

export interface ShellTask {
  id: string
  command: string
  description?: string
  cwd?: string
  timeoutMs?: number
}

export interface ShellResult {
  taskId: string
  output?: string
  error?: string
  stderr?: string
  code?: number
  executedAt: number
  durationMs: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /**
   * Execute all scheduled tasks in sequence.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    for (const task of this.tasks) {
      const start = Date.now()
      try {
        const res = await execCommand(task.command, {
          cwd: task.cwd,
          timeoutMs: task.timeoutMs,
        })
        results.push({
          taskId: task.id,
          output: res.stdout,
          stderr: res.stderr,
          code: res.code,
          executedAt: start,
          durationMs: Date.now() - start,
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          error: err?.message ?? String(err),
          executedAt: start,
          durationMs: Date.now() - start,
        })
      }
    }
    this.tasks = []
    return results
  }

  /**
   * Run a single task immediately without adding it to the queue.
   */
  async runNow(task: ShellTask): Promise<ShellResult> {
    const start = Date.now()
    const res = await tryExecCommand(task.command, {
      cwd: task.cwd,
      timeoutMs: task.timeoutMs,
    })
    if (res.ok) {
      return {
        taskId: task.id,
        output: res.stdout,
        stderr: res.stderr,
        executedAt: start,
        durationMs: Date.now() - start,
      }
    }
    return {
      taskId: task.id,
      error: res.error,
      executedAt: start,
      durationMs: Date.now() - start,
    }
  }

  /**
   * Clear all scheduled tasks without running them.
   */
  clear(): void {
    this.tasks = []
  }

  /**
   * List currently scheduled tasks.
   */
  list(): ShellTask[] {
    return [...this.tasks]
  }
}
