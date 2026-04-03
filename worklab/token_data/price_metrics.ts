export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  medianPrice: number
  volatility: number            // standard deviation (population)
  maxPrice: number
  minPrice: number
  priceRange: number
  lastPrice: number
  sampleCount: number
  cagrPct?: number              // optional: CAGR over the full time span (in %)
}

export class TokenAnalysisCalculator {
  constructor(private data: PricePoint[]) {}

  private get clean(): PricePoint[] {
    // filter invalid points and sort by timestamp asc (stable)
    return this.data
      .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.price))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  getAveragePrice(): number {
    const arr = this.clean
    if (arr.length === 0) return 0
    const sum = arr.reduce((acc, p) => acc + p.price, 0)
    return sum / arr.length
  }

  getMedianPrice(): number {
    const arr = this.clean
    if (arr.length === 0) return 0
    const nums = arr.map(p => p.price).sort((a, b) => a - b)
    const mid = Math.floor(nums.length / 2)
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
  }

  getVolatility(): number {
    const arr = this.clean
    if (arr.length <= 1) return 0
    const avg = this.getAveragePrice()
    const variance = arr.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) / arr.length
    return Math.sqrt(variance)
  }

  getMaxPrice(): number {
    const arr = this.clean
    if (arr.length === 0) return 0
    return arr.reduce((max, p) => (p.price > max ? p.price : max), -Infinity)
  }

  getMinPrice(): number {
    const arr = this.clean
    if (arr.length === 0) return 0
    return arr.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
  }

  getLastPrice(): number {
    const arr = this.clean
    return arr.length ? arr[arr.length - 1].price : 0
  }

  /** Compound annual growth rate across the series time span (percentage). */
  getCagrPct(): number | undefined {
    const arr = this.clean
    if (arr.length < 2) return undefined
    const first = arr[0]
    const last = arr[arr.length - 1]
    const dtYears = (last.timestamp - first.timestamp) / (365 * 24 * 60 * 60 * 1000)
    if (dtYears <= 0 || first.price <= 0) return undefined
    const cagr = Math.pow(last.price / first.price, 1 / dtYears) - 1
    return Math.round(cagr * 10000) / 100 // to %
  }

  computeMetrics(): TokenMetrics {
    const avg = this.getAveragePrice()
    const med = this.getMedianPrice()
    const vol = this.getVolatility()
    const max = this.getMaxPrice()
    const min = this.getMinPrice()
    const last = this.getLastPrice()
    const range = max - min

    const base: TokenMetrics = {
      averagePrice: avg,
      medianPrice: med,
      volatility: vol,
      maxPrice: Number.isFinite(max) ? max : 0,
      minPrice: Number.isFinite(min) ? min : 0,
      priceRange: Number.isFinite(range) ? range : 0,
      lastPrice: last,
      sampleCount: this.clean.length,
    }

    const cagrPct = this.getCagrPct()
    return cagrPct === undefined ? base : { ...base, cagrPct }
  }
}
