import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"

/**
 * Result returned by the Typeform submission handler
 */
export interface SubmissionResult {
  success: boolean
  message: string
  taskId?: string
}

/**
 * Processes a Typeform webhook payload to schedule a new task.
 * - Validates input via Zod
 * - Normalizes fields
 * - Generates a deterministic task ID
 */
export async function handleTypeformSubmission(raw: unknown): Promise<SubmissionResult> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => i.message).join("; ")
    return { success: false, message: `Validation error: ${details}` }
  }

  // Normalize to avoid duplicates due to casing/whitespace
  const input: TaskFormInput = {
    ...parsed.data,
    taskName: parsed.data.taskName.trim(),
    taskType: parsed.data.taskType.trim().toLowerCase(),
    scheduleCron: parsed.data.scheduleCron.trim(),
    parameters: parsed.data.parameters ?? {},
  }

  const taskId = await computeDeterministicId({
    name: input.taskName,
    type: input.taskType,
    cron: input.scheduleCron,
    params: input.parameters,
  })

  // TODO: call real scheduler here, e.g. scheduler.create({ id: taskId, ...input })

  return {
    success: true,
    message: `Task "${input.taskName}" scheduled`,
    taskId,
  }
}

/* ---------------- helpers (compact) ---------------- */

async function computeDeterministicId(payload: unknown): Promise<string> {
  const json = stableStringify(payload)
  const buf = new TextEncoder().encode(json)

  // Prefer SubtleCrypto (browser/Node 19+)
  const subtle: SubtleCrypto | undefined =
    (globalThis as any)?.crypto?.subtle ?? (await tryNodeWebcrypto())

  if (subtle) {
    const digest = await subtle.digest("SHA-256", buf)
    return bufferToHex(digest).slice(0, 32)
  }

  // Fallback: quick hash (non-cryptographic)
  return djb2(buf).toString(16)
}

async function tryNodeWebcrypto(): Promise<SubtleCrypto | undefined> {
  try {
    const { webcrypto } = await import("crypto")
    return webcrypto.subtle
  } catch {
    return undefined
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ""
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0")
  return hex
}

function djb2(bytes: Uint8Array): number {
  let hash = 5381
  for (let i = 0; i < bytes.length; i++) hash = ((hash << 5) + hash) ^ bytes[i]
  return hash >>> 0
}
