import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * - Trims/normalizes strings
 * - Allows parameters as string | number | boolean
 * - Validates CRON with ranges/lists/steps
 * - Optional metadata (description, priority, tags)
 */

/** 5-field CRON validator supporting lists (a,b), ranges (a-b), and steps (*/x or a-b/x). */
const isValidCron = (expr: string): boolean => {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const inRange = (n: number, lo: number, hi: number) => n >= lo && n <= hi
  const fieldOk = (token: string, lo: number, hi: number) => {
    for (const seg of token.split(",")) {
      if (seg === "*") continue
      const [base, stepStr] = seg.split("/")
      if (stepStr !== undefined && (!/^\d+$/.test(stepStr) || Number(stepStr) <= 0)) return false
      if (/^\d+$/.test(base)) {
        if (!inRange(Number(base), lo, hi)) return false
        continue
      }
      const [a, b] = base.split("-")
      if (!(a && b && /^\d+$/.test(a) && /^\d+$/.test(b))) return false
      const na = Number(a), nb = Number(b)
      if (!(inRange(na, lo, hi) && inRange(nb, lo, hi) && na <= nb)) return false
    }
    return true
  }

  const [min, hour, day, month, weekday] = parts
  return (
    fieldOk(min, 0, 59) &&
    fieldOk(hour, 0, 23) &&
    fieldOk(day, 1, 31) &&
    fieldOk(month, 1, 12) &&
    fieldOk(weekday, 0, 6)
  )
}

const Trimmed = z.string().transform((s) => s.trim())

export const TaskFormSchema = z.object({
  taskName: Trimmed.min(3, "taskName must be at least 3 characters").max(100, "taskName must be at most 100 characters"),
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor"]).describe("supported task types"),
  parameters: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .refine((obj) => Object.keys(obj).length > 0, "parameters must include at least one key"),
  scheduleCron: Trimmed.refine(isValidCron, "invalid cron expression: expected 5 fields (min hour day month weekday)"),
  // Optional metadata
  description: Trimmed.max(280, "description must be <= 280 characters").optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  tags: z.array(Trimmed).max(10, "no more than 10 tags").optional(),
}).refine(
  (d) => !d.description || d.description.length >= 3,
  { message: "description must be at least 3 characters if provided", path: ["description"] }
)

export type TaskFormInput = z.infer<typeof TaskFormSchema>
