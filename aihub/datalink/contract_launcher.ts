export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  /** request timeout in ms (default 10000) */
  timeoutMs?: number
  /** if true, retry once on failure */
  retryOnFail?: boolean
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  rawResponse?: unknown
  durationMs?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    return this.tryDeploy(this.config.retryOnFail ?? false)
  }

  private async tryDeploy(retry: boolean): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, timeoutMs } = this.config
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? 10_000)

    const started = performance.now?.() ?? Date.now()
    try {
      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ contractName, parameters }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        if (retry) return this.tryDeploy(false)
        return {
          success: false,
          error: `HTTP ${res.status}: ${text}`,
          durationMs: Math.round((performance.now?.() ?? Date.now()) - started),
        }
      }

      const json = await res.json()
      return {
        success: true,
        address: json.contractAddress ?? json.address,
        transactionHash: json.txHash ?? json.transactionHash,
        rawResponse: json,
        durationMs: Math.round((performance.now?.() ?? Date.now()) - started),
      }
    } catch (err: any) {
      if (retry) return this.tryDeploy(false)
      return {
        success: false,
        error: err?.message ?? String(err),
        durationMs: Math.round((performance.now?.() ?? Date.now()) - started),
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
