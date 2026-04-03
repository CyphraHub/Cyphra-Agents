/**
 * Analyze on-chain orderbook depth for a given market.
 */
export interface Order {
  price: number
  size: number
}

export interface DepthSnapshot {
  bids: Order[]
  asks: Order[]
  ts?: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  spreadPct: number
  midPrice: number
  totalBidDepth: number
  totalAskDepth: number
  depthImbalancePct: number
  vwapBidTop5?: number
  vwapAskTop5?: number
}

export interface DepthAnalyzerOptions {
  timeoutMs?: number
}

export class TokenDepthAnalyzer {
  private readonly timeoutMs: number

  constructor(
    private rpcEndpoint: string,
    private marketId: string,
    opts: DepthAnalyzerOptions = {}
  ) {
    this.timeoutMs = opts.timeoutMs ?? 10_000
  }

  async fetchOrderbook(depth = 50): Promise<DepthSnapshot> {
    const url = `${this.rpcEndpoint}/orderbook/${encodeURIComponent(this.marketId)}?depth=${depth}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status}`)
      const data = (await res.json()) as { bids: Order[]; asks: Order[]; ts?: number }

      // Defensive normalization & sorting (bids desc, asks asc)
      const bids = (data.bids ?? [])
        .filter((o) => Number.isFinite(o.price) && Number.isFinite(o.size) && o.size > 0)
        .sort((a, b) => b.price - a.price)
      const asks = (data.asks ?? [])
        .filter((o) => Number.isFinite(o.price) && Number.isFinite(o.size) && o.size > 0)
        .sort((a, b) => a.price - b.price)

      return { bids, asks, ts: data.ts }
    } finally {
      clearTimeout(timer)
    }
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    const avg = (arr: Order[]) =>
      arr.length ? arr.reduce((s, o) => s + o.size, 0) / arr.length : 0

    const sum = (arr: Order[]) => arr.reduce((s, o) => s + o.size, 0)

    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0
    const spreadPct = mid > 0 ? (spread / mid) * 100 : 0

    // Simple VWAP over top 5 levels per side
    const vwap = (levels: Order[]) => {
      const top = levels.slice(0, 5)
      const notional = top.reduce((s, o) => s + o.price * o.size, 0)
      const qty = top.reduce((s, o) => s + o.size, 0)
      return qty > 0 ? notional / qty : undefined
    }

    const totalBidDepth = sum(bids)
    const totalAskDepth = sum(asks)
    const imbalance =
      totalBidDepth + totalAskDepth > 0
        ? ((totalBidDepth - totalAskDepth) / (totalBidDepth + totalAskDepth)) * 100
        : 0

    return {
      averageBidDepth: avg(bids),
      averageAskDepth: avg(asks),
      spread,
      spreadPct: Math.round(spreadPct * 100) / 100,
      midPrice: mid,
      totalBidDepth,
      totalAskDepth,
      depthImbalancePct: Math.round(imbalance * 100) / 100,
      vwapBidTop5: vwap(bids),
      vwapAskTop5: vwap(asks),
    }
  }
}
