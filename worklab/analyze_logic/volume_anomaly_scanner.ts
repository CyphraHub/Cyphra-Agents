export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  avgWindow?: number
  deviation?: number
  zScore?: number
}

export interface SpikeOptions {
  /** rolling window size (default 10) */
  windowSize?: number
  /** emit when curr / baseline >= threshold (default 2.0) */
  spikeThreshold?: number
  /** baseline = avg (+ k * stdDev if k > 0). default 0 = avg only */
  stdDevK?: number
  /** ignore volumes below this absolute floor (default 0) */
  minVolume?: number
  /** if set, require at least this many ms between emitted spikes */
  minIntervalMs?: number
  /** break window when gaps between points exceed this (ms) */
  maxGapMs?: number
  /** if true, sort points by timestamp asc before processing (default true) */
  sortByTimestamp?: boolean
}

/**
 * Detect spikes in trading volume compared to a rolling average window.
 * Uses an O(n) rolling sum/sumsq for avg/stddev and supports optional gap handling.
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  options: SpikeOptions = {}
): SpikeEvent[] {
  const {
    windowSize = 10,
    spikeThreshold = 2.0,
    stdDevK = 0,
    minVolume = 0,
    minIntervalMs,
    maxGapMs,
    sortByTimestamp = true,
  } = options

  const clean = sanitize(points, sortByTimestamp)
  if (clean.length < windowSize || windowSize <= 0) return []

  // rolling stats
  let sum = 0
  let sumsq = 0

  // prime window [0, windowSize)
  for (let i = 0; i < windowSize; i++) {
    const v = clean[i].volumeUsd
    sum += v
    sumsq += v * v
  }

  const events: SpikeEvent[] = []
  let lastEmittedTs = -Infinity

  const gapTooLarge = (i: number) =>
    typeof maxGapMs === "number" &&
    i > 0 &&
    clean[i].timestamp - clean[i - 1].timestamp > maxGapMs

  for (let i = windowSize; i < clean.length; i++) {
    // compute baseline for window [i-windowSize, i)
    const avg = sum / windowSize
    const variance = Math.max(0, sumsq / windowSize - avg * avg)
    const stdDev = Math.sqrt(variance)
    const baseline = avg + stdDevK * stdDev

    const curr = clean[i].volumeUsd
    const ratio = baseline > 0 ? curr / baseline : Infinity
    const ts = clean[i].timestamp

    const spaced =
      typeof minIntervalMs === "number" ? ts - lastEmittedTs >= minIntervalMs : true

    if (!gapTooLarge(i) && curr >= minVolume && ratio >= spikeThreshold && spaced) {
      const z = stdDev > 0 ? (curr - avg) / stdDev : Infinity
      events.push({
        timestamp: ts,
        volume: curr,
        spikeRatio: round2(ratio),
        avgWindow: round2(avg),
        deviation: round2(stdDev),
        zScore: isFinite(z) ? round2(z) : undefined,
      })
      lastEmittedTs = ts
    }

    // roll window forward: remove outgoing, add incoming
    const outV = clean[i - windowSize].volumeUsd
    sum -= outV
    sumsq -= outV * outV
    sum += curr
    sumsq += curr * curr
  }

  return events
}

/* ----------------- helpers ----------------- */

function sanitize(points: VolumePoint[], sort: boolean): VolumePoint[] {
  const filtered = points.filter(
    (p) =>
      p &&
      Number.isFinite(p.timestamp) &&
      Number.isFinite(p.volumeUsd) &&
      p.timestamp > 0 &&
      p.volumeUsd >= 0
  )
  if (!sort) return filtered
  return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
