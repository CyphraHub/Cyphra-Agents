import { z } from "zod"

/**
 * Base types for any action
 */

export type ActionSchema = z.ZodObject<z.ZodRawShape>
export type InferActionInput<S extends ActionSchema> = z.infer<S>

export type ActionStatus = "ok" | "error"

export interface ActionError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ActionResponse<T> {
  status: ActionStatus
  notice: string
  data?: T
  error?: ActionError
  meta?: {
    actionId?: string
    version?: string
    durationMs?: number
  }
}

export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  /** unique identifier of the action */
  id: string
  /** short human readable summary */
  summary: string
  /** semantic version, optional */
  version?: string
  /** arbitrary tags for discovery and grouping */
  tags?: string[]
  /** zod schema describing the input payload */
  input: S
  /**
   * optional authorization hook
   * return true to allow execution
   */
  authorize?(context: Ctx): boolean | Promise<boolean>
  /**
   * execute the action
   * must return a structured ActionResponse
   */
  execute(args: { payload: InferActionInput<S>; context: Ctx }): Promise<ActionResponse<R>>
}

/* ---------------- helpers ---------------- */

/**
 * Validates raw payload against the action schema
 * returns typed payload or an ActionResponse with error
 */
export function validateActionInput<S extends ActionSchema>(
  schema: S,
  raw: unknown
): { ok: true; data: InferActionInput<S> } | { ok: false; error: ActionResponse<never> } {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: "error",
        notice: "validation failed",
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(i => i.message).join("; "),
          details: { issues: parsed.error.issues },
        },
      },
    }
  }
  return { ok: true, data: parsed.data }
}

/**
 * Utility to build a standardized success response
 */
export function okResponse<T>(
  notice: string,
  data?: T,
  meta?: ActionResponse<T>["meta"]
): ActionResponse<T> {
  return { status: "ok", notice, data, meta }
}

/**
 * Utility to build a standardized error response
 */
export function errorResponse(
  notice: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  meta?: ActionResponse<never>["meta"]
): ActionResponse<never> {
  return {
    status: "error",
    notice,
    error: { code, message, details },
    meta,
  }
}
