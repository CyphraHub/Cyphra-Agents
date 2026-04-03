/**
 * Analyze on-chain token activity: fetch recent signatures and summarize SPL token transfers.
 * Uses real Solana JSON-RPC (POST) with jsonParsed encoding.
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
}

type Commitment = "processed" | "confirmed" | "finalized"

interface RpcConfig {
  timeoutMs?: number
  commitment?: Commitment
}

interface RpcResponse<T> {
  jsonrpc: "2.0"
  id: string | number
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

type SignatureInfo = {
  signature: string
  blockTime?: number
}

type GetSignaturesForAddressResult = SignatureInfo[]

type UiTokenAmount = {
  uiAmount: number | null
  decimals: number
  amount: string
}

type TokenBalance = {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: UiTokenAmount
}

type TransactionMeta = {
  preTokenBalances?: TokenBalance[]
  postTokenBalances?: TokenBalance[]
}

type GetTransactionResult = {
  blockTime: number | null
  meta: TransactionMeta | null
}

export class TokenActivityAnalyzer {
  private timeoutMs: number
  private commitment: Commitment

  constructor(private rpcEndpoint: string, cfg: RpcConfig = {}) {
    this.timeoutMs = cfg.timeoutMs ?? 10_000
    this.commitment = cfg.commitment ?? "confirmed"
  }

  /** Generic JSON-RPC call helper */
  private async rpcCall<T>(method: string, params: any[]): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
      const json = (await res.json()) as RpcResponse<T>
      if (json.error) throw new Error(`RPC ${method} error: ${json.error.message}`)
      if (json.result === undefined) throw new Error(`RPC ${method} missing result`)
      return json.result
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch recent signatures for an address (auto-paginates until 'limit' collected).
   */
  async fetchRecentSignatures(address: string, limit = 100): Promise<SignatureInfo[]> {
    const out: SignatureInfo[] = []
    let before: string | undefined = undefined

    while (out.length < limit) {
      const page: GetSignaturesForAddressResult = await this.rpcCall(
        "getSignaturesForAddress",
        [
          address,
          {
            limit: Math.min(1_000, limit - out.length),
            before,
            commitment: this.commitment,
          },
        ]
      )
      if (!page.length) break
      out.push(...page)
      before = page[page.length - 1].signature
      if (page.length < 1_000) break
    }
    return out.slice(0, limit)
  }

  private async fetchTransaction(signature: string): Promise<GetTransactionResult | null> {
    // Use jsonParsed to get token balances with owners/mints
    const result = await this.rpcCall<GetTransactionResult | null>("getTransaction", [
      signature,
      {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
        commitment: this.commitment,
      },
    ])
    return result
  }

  /**
   * Analyze token activity for a given SPL mint:
   * - Computes per-owner delta of the mint between pre/post token balances
   * - If exactly one owner decreases and one increases, infer source→destination
   * - Otherwise, keep unknown where direction cannot be uniquely inferred
   */
  async analyzeActivity(mint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigs = await this.fetchRecentSignatures(mint, limit)
    const out: ActivityRecord[] = []

    for (const sigInfo of sigs) {
      try {
        const tx = await this.fetchTransaction(sigInfo.signature)
        if (!tx || !tx.meta) continue

        const pre = (tx.meta.preTokenBalances ?? []).filter((b) => b.mint === mint)
        const post = (tx.meta.postTokenBalances ?? []).filter((b) => b.mint === mint)

        // Build owner→amount maps (uiAmount null treated as 0)
        const preByOwner = new Map<string, number>()
        const postByOwner = new Map<string, number>()

        for (const b of pre) {
          const owner = b.owner ?? `acct#${b.accountIndex}`
          preByOwner.set(owner, Number(b.uiTokenAmount.uiAmount ?? 0))
        }
        for (const b of post) {
          const owner = b.owner ?? `acct#${b.accountIndex}`
          postByOwner.set(owner, Number(b.uiTokenAmount.uiAmount ?? 0))
        }

        // Union of owners appearing in pre or post
        const owners = new Set<string>([...preByOwner.keys(), ...postByOwner.keys()])
        const deltas: Array<{ owner: string; delta: number }> = []
        for (const owner of owners) {
          const before = preByOwner.get(owner) ?? 0
          const after = postByOwner.get(owner) ?? 0
          const delta = after - before
          if (delta !== 0) deltas.push({ owner, delta })
        }
        if (!deltas.length) continue

        const ts = (tx.blockTime ?? sigInfo.blockTime ?? 0) * 1000

        // If clean two-party transfer (one negative, one positive), infer direction
        const negatives = deltas.filter((d) => d.delta < 0)
        const positives = deltas.filter((d) => d.delta > 0)

        if (negatives.length === 1 && positives.length === 1) {
          const src = negatives[0]
          const dst = positives[0]
          const amount = Math.min(Math.abs(src.delta), Math.abs(dst.delta))
          out.push({
            timestamp: ts,
            signature: sigInfo.signature,
            source: src.owner,
            destination: dst.owner,
            amount,
          })
        } else {
          // Fallback: emit per-owner change with unknown counterparty
          for (const d of deltas) {
            out.push({
              timestamp: ts,
              signature: sigInfo.signature,
              source: d.delta < 0 ? d.owner : "unknown",
              destination: d.delta > 0 ? d.owner : "unknown",
              amount: Math.abs(d.delta),
            })
          }
        }
      } catch {
        // skip failing transaction
        continue
      }
    }

    // Stable order by timestamp asc, then signature
    out.sort((a, b) => (a.timestamp - b.timestamp) || a.signature.localeCompare(b.signature))
    return out
  }
}
