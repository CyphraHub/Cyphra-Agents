export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
}

/**
 * Analyze a series of price points to determine overall trend segments.
 * Adds noise tolerance (epsilon) and optional sorting by timestamp.
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5,
  epsilonPct: number = 0, // treat ±epsilonPct as flat noise
  sortByTimestamp: boolean = true
): TrendResult[] {
  const pts = sanitize(points, sortByTimestamp)
  const results: TrendResult[] = []
  if (pts.length < minSegmentLength) return results

  let segStart = 0

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1].priceUsd
    const curr = pts[i].priceUsd
    const dirNow = direction(prev, curr, epsilonPct)

    const reachedMin = i - segStart + 1 >= minSegmentLength
    const atLast = i === pts.length - 1
    const willReverse =
      !atLast && reversalLikely(pts[i].priceUsd, pts[i + 1].priceUsd, epsilonPct)

    if (reachedMin && (atLast || willReverse)) {
      const start = pts[segStart]
      const end = pts[i]
      const changePct = pctChange(start.priceUsd, end.priceUsd)
      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: Math.abs(changePct) <= epsilonPct ? "neutral" : changePct > 0 ? "upward" : "downward",
        changePct: round2(changePct),
      })
      segStart = i
    }
  }

  // If nothing was emitted but we have enough points, emit whole series
  if (results.length === 0 && pts.length >= minSegmentLength) {
    const start = pts[0]
    const end = pts[pts.length - 1]
    const changePct = pctChange(start.priceUsd, end.priceUsd)
    results.push({
      startTime: start.timestamp,
      endTime: end.timestamp,
      trend: Math.abs(changePct) <= epsilonPct ? "neutral" : changePct > 0 ? "upward" : "downward",
      changePct: round2(changePct),
    })
  }

  return results
}

/* ---------- helpers (compact) ---------- */

function sanitize(arr: PricePoint[], sort: boolean): PricePoint[] {
  const filtered = arr.filter(
    (p) => p && Number.isFinite(p.timestamp) && Number.isFinite(p.priceUsd)
  )
  if (!sort) return filtered
  return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
}

function pctChange(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : (b > 0 ? 100 : -100)
  return ((b - a) / a) * 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function direction(a: number, b: number, epsPct: number): 1 | -1 | 0 {
  const ch = pctChange(a, b)
  if (Math.abs(ch) <= epsPct) return 0
  return ch > 0 ? 1 : -1
}

function reversalLikely(curr: number, next: number, epsPct: number): boolean {
  const d = direction(curr, next, epsPct)
  return d !== 0 // non-neutral move signals potential reversal at boundary
}
