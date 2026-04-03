export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number): void {
    this.cache.set(key, { key, value, updatedAt: Date.now() })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  size(): number {
    return this.cache.size
  }

  oldest(): MetricEntry | undefined {
    let min: MetricEntry | undefined
    for (const e of this.cache.values()) {
      if (!min || e.updatedAt < min.updatedAt) {
        min = e
      }
    }
    return min
  }

  newest(): MetricEntry | undefined {
    let max: MetricEntry | undefined
    for (const e of this.cache.values()) {
      if (!max || e.updatedAt > max.updatedAt) {
        max = e
      }
    }
    return max
  }

  average(): number {
    const values = Array.from(this.cache.values()).map(e => e.value)
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  toJSON(): Record<string, number> {
    const out: Record<string, number> = {}
    for (const e of this.cache.values()) {
      out[e.key] = e.value
    }
    return out
  }
}
