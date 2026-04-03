import type { z } from "zod"
import {
  BaseAction,
  ActionResponse,
  validateActionInput,
  errorResponse,
} from "./action_contract"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
}

/**
 * Central Agent: routes calls to registered actions.
 * - Strongly validates payloads against each action's Zod schema
 * - Supports optional authorization hook on actions
 * - Provides small registry utilities
 */
export class AgentRouter {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  register<S extends z.ZodObject<z.ZodRawShape>, R>(
    action: BaseAction<S, R, AgentContext>
  ): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action already registered: "${action.id}"`)
    }
    this.actions.set(action.id, action)
  }

  unregister(actionId: string): boolean {
    return this.actions.delete(actionId)
  }

  has(actionId: string): boolean {
    return this.actions.has(actionId)
  }

  list(): string[] {
    return Array.from(this.actions.keys())
  }

  describe(actionId: string): { id: string; summary: string; version?: string; tags?: string[] } | null {
    const a = this.actions.get(actionId)
    if (!a) return null
    return { id: a.id, summary: a.summary, version: a.version, tags: a.tags }
  }

  /**
   * Invoke an action by id with a raw payload.
   * - Validates input with the action's Zod schema
   * - Applies optional authorize(context) guard
   * - Returns a structured ActionResponse
   */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    context: AgentContext
  ): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return errorResponse("action not found", "NOT_FOUND", `Unknown action "${actionId}"`)
    }

    // Authorization (optional)
    if (typeof action.authorize === "function") {
      const ok = await action.authorize(context)
      if (!ok) {
        return errorResponse("forbidden", "UNAUTHORIZED", `Not allowed to invoke "${actionId}"`)
      }
    }

    // Validate input
    const validated = validateActionInput(action.input, payload)
    if (!validated.ok) {
      // validated.error is already a well-formed ActionResponse
      return validated.error as ActionResponse<never>
    }

    // Execute with timing meta
    const started = performance.now?.() ?? Date.now()
    try {
      const res = await action.execute({ payload: validated.data, context })
      const ended = performance.now?.() ?? Date.now()
      if (!res.meta) res.meta = {}
      res.meta.durationMs = Math.round(ended - started)
      res.meta.actionId = action.id
      res.meta.version = action.version
      return res as ActionResponse<R>
    } catch (err: any) {
      const ended = performance.now?.() ?? Date.now()
      return errorResponse(
        "execution failed",
        "ACTION_ERROR",
        err?.message ?? String(err),
        { stack: err?.stack },
        { actionId: action.id, version: action.version, durationMs: Math.round(ended - started) }
      )
    }
  }
}
