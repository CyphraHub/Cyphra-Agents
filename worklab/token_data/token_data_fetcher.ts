export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export interface FetcherOptions {
  timeoutMs?: number
  retries?: number
}

export class TokenDataFetcher {
  private timeoutMs: number
  private retries: number

  constructor(private apiBase: string, options: FetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.retries = options.retries ?? 1
  }

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const url = `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`
    let lastErr: Error | null = null

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Failed to fetch history for ${symbol}: HTTP ${res.status}`)
        }
        const raw = (await res.json()) as any[]
        return raw
          .filter((r) => r && r.time && r.priceUsd !== undefined)
          .map((r) => ({
            timestamp: Number(r.time) * 1000,
            priceUsd: Number(r.priceUsd),
            volumeUsd: Number(r.volumeUsd ?? 0),
            marketCapUsd: Number(r.marketCapUsd ?? 0),
          }))
      } catch (err: any) {
        lastErr = err
        if (attempt < this.retries) {
          await new Promise((r) => setTimeout(r, 500 * attempt))
        }
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr ?? new Error("Unknown error fetching token history")
  }

  /**
   * Fetch the most recent data point.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    if (history.length === 0) return null
    return history.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
  }

  /**
   * Fetch history within a given time range.
   */
  async fetchRange(symbol: string, from: number, to: number): Promise<TokenDataPoint[]> {
    const history = await this.fetchHistory(symbol)
    return history.filter((p) => p.timestamp >= from && p.timestamp <= to)
  }
}
