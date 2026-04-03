/**
 * Detect volume-based patterns in a series of activity amounts.
 */
export interface PatternMatch {
  index: number
  window: number
  average: number
  deviation?: number
  peak?: number
  isSustained?: boolean
}

/**
 * Scan a numeric series for patterns where a moving window
 * exceeds a given threshold.
 */
export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  const matches: PatternMatch[] = []
  if (windowSize <= 0 || volumes.length < windowSize) return matches

  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    if (avg >= threshold) {
      const deviation = Math.sqrt(
        slice.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / windowSize
      )
      const peak = Math.max(...slice)
      const isSustained = slice.every((v) => v >= threshold * 0.9)
      matches.push({
        index: i,
        window: windowSize,
        average: Math.round(avg * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        peak,
        isSustained,
      })
    }
  }
  return matches
}
