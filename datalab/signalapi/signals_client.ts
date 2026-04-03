export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
  durationMs?: number
}

/**
 * Simple HTTP client for fetching signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string, private timeoutMs: number = 10_000) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async doFetch<T>(path: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    const started = performance.now?.() ?? Date.now()
    try {
      const res = await fetch(url, { method: "GET", headers: this.getHeaders(), signal: controller.signal })
      const duration = Math.round((performance.now?.() ?? Date.now()) - started)
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}`, status: res.status, durationMs: duration }
      }
      const json = (await res.json()) as T
      return { success: true, data: json, status: res.status, durationMs: duration }
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) }
    } finally {
      clearTimeout(timer)
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.doFetch<Signal[]>("/signals")
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.doFetch<Signal>(`/signals/${encodeURIComponent(id)}`)
  }

  async querySignalsByType(type: string): Promise<ApiResponse<Signal[]>> {
    return this.doFetch<Signal[]>(`/signals?type=${encodeURIComponent(type)}`)
  }

  async fetchSince(timestamp: number): Promise<ApiResponse<Signal[]>> {
    return this.doFetch<Signal[]>(`/signals?since=${encodeURIComponent(timestamp)}`)
  }
}
