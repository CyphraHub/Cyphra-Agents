export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  medianPrice: number
  volatility: number       // population standard deviation
  maxPrice: number
  minPrice: number
  priceRange: number
  lastPrice: number
  sampleCount: number
  cagrPct?: number
}

export class TokenAnalysisCalculator {
  constructor(private data: PricePoint[]) {}

  private get clean(): PricePoint[] {
    return this.data
      .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.price))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  getAveragePrice(): number {
    const arr = this.clean
    if (!arr.length) return 0
    return arr.reduce((acc, p) => acc + p.price, 0) / arr.length
  }

  getMedianPrice(): number {
    const arr = this.clean
    if (!arr.length) return 0
    const prices = arr.map(p => p.price).sort((a, b) => a - b)
    const mid = Math.floor(prices.length / 2)
    return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
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
    return arr.length ? Math.max(...arr.map(p => p.price)) : 0
  }

  getMinPrice(): number {
    const arr = this.clean
    return arr.length ? Math.min(...arr.map(p => p.price)) : 0
  }

  getLastPrice(): number {
    const arr = this.clean
    return arr.length ? arr[arr.length - 1].price : 0
  }

  /** Compound annual growth rate (percentage) over series span. */
  getCagrPct(): number | undefined {
    const arr = this.clean
    if (arr.length < 2) return undefined
    const first = arr[0], last = arr[arr.length - 1]
    const years = (last.timestamp - first.timestamp) / (365 * 24 * 60 * 60 * 1000)
    if (years <= 0 || first.price <= 0) return undefined
    const cagr = Math.pow(last.price / first.price, 1 / years) - 1
    return Math.round(cagr * 10000) / 100
  }

  computeMetrics(): TokenMetrics {
    const avg = this.getAveragePrice()
    const med = this.getMedianPrice()
    const vol = this.getVolatility()
    const max = this.getMaxPrice()
    const min = this.getMinPrice()
    const last = this.getLastPrice()
    const range = max - min
    const cagr = this.getCagrPct()

    const base: TokenMetrics = {
      averagePrice: avg,
      medianPrice: med,
      volatility: vol,
      maxPrice: max,
      minPrice: min,
      priceRange: range,
      lastPrice: last,
      sampleCount: this.clean.length,
    }

    return cagr === undefined ? base : { ...base, cagrPct: cagr }
  }
}
