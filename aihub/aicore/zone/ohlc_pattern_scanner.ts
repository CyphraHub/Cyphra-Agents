import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

export interface DetectionOptions {
  /** Minimum confidence required to emit a signal (default 0.6) */
  minConfidence?: number
  /** Allow multiple patterns per candle (default false → pick the best) */
  allowMultiple?: boolean
  /** Per-pattern thresholds (falls back to minConfidence) */
  thresholds?: Partial<Record<CandlestickPattern, number>>
  /** How many prior closes to inspect for basic trend context (default 5) */
  trendWindow?: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`, {
      timeout: 10_000,
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as Candle[]
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const ratio = body > 0 ? lowerWick / body : 0
    return ratio > 2 && body / (c.high - c.low) < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    const ratio = body > 0 ? upperWick / body : 0
    return ratio > 2 && body / (c.high - c.low) < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const ratio = range > 0 ? body / range : 1
    return ratio < 0.1 ? 1 - ratio * 10 : 0
  }

  /* ------------------------- Trend helpers ------------------------ */

  private basicDowntrend(closes: number[], i: number, window: number): boolean {
    const start = Math.max(0, i - window)
    if (i - start < 2) return false
    const slice = closes.slice(start, i + 1)
    const first = slice[0]
    const last = slice[slice.length - 1]
    return last < first
  }

  private basicUptrend(closes: number[], i: number, window: number): boolean {
    const start = Math.max(0, i - window)
    if (i - start < 2) return false
    const slice = closes.slice(start, i + 1)
    const first = slice[0]
    const last = slice[slice.length - 1]
    return last > first
  }

  /* --------------------------- Public API ------------------------- */

  /**
   * Detect candlestick patterns over a candle series
   */
  detectPatterns(candles: Candle[], opts: DetectionOptions = {}): PatternSignal[] {
    if (!Array.isArray(candles) || candles.length === 0) return []

    const {
      minConfidence = 0.6,
      allowMultiple = false,
      thresholds = {},
      trendWindow = 5,
    } = opts

    const closes = candles.map(c => c.close)
    const out: PatternSignal[] = []

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const prev = i > 0 ? candles[i - 1] : undefined

      // Base confidences
      let scoreMap: Partial<Record<CandlestickPattern, number>> = {
        Hammer: this.isHammer(c),
        ShootingStar: this.isShootingStar(c),
        Doji: this.isDoji(c),
      }

      if (prev) {
        scoreMap.BullishEngulfing = this.isBullishEngulfing(prev, c)
        scoreMap.BearishEngulfing = this.isBearishEngulfing(prev, c)
      }

      // Contextual nudges: hammers stronger in downtrends; shooting stars stronger in uptrends
      const down = this.basicDowntrend(closes, i, trendWindow)
      const up = this.basicUptrend(closes, i, trendWindow)

      if (scoreMap.Hammer && down) scoreMap.Hammer = Math.min(1, scoreMap.Hammer + 0.1)
      if (scoreMap.ShootingStar && up) scoreMap.ShootingStar = Math.min(1, scoreMap.ShootingStar + 0.1)

      // Emit signals by thresholding
      const candidates: PatternSignal[] = []
      for (const [pattern, rawScore] of Object.entries(scoreMap) as [CandlestickPattern, number][]) {
        const th = thresholds[pattern] ?? minConfidence
        if ((rawScore ?? 0) >= th) {
          candidates.push({
            timestamp: c.timestamp,
            pattern,
            confidence: Math.round(rawScore * 1000) / 1000,
          })
        }
      }

      if (allowMultiple) {
        out.push(...candidates)
      } else if (candidates.length) {
        // choose the highest confidence pattern at this candle
        candidates.sort((a, b) => b.confidence - a.confidence)
        out.push(candidates[0])
      }
    }

    return out
  }

  /**
   * Convenience: fetch candles then detect patterns
   */
  async scanSymbol(
    symbol: string,
    limit = 100,
    options: DetectionOptions = {}
  ): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    return this.detectPatterns(candles, options)
  }
}
