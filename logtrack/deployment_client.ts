export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number
  retries?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  attempt?: number
  elapsedMs?: number
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  /**
   * Deploy a contract to the configured endpoint.
   * Includes retry logic, timeout, and richer result metadata.
   */
  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters } = this.config
    const retries = this.config.retries ?? 1
    const timeoutMs = this.config.timeoutMs ?? 15_000

    for (let attempt = 1; attempt <= retries; attempt++) {
      const start = Date.now()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
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
          return {
            success: false,
            error: `HTTP ${res.status}: ${text}`,
            attempt,
            elapsedMs: Date.now() - start,
          }
        }
        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          attempt,
          elapsedMs: Date.now() - start,
        }
      } catch (err: any) {
        if (attempt === retries) {
          return {
            success: false,
            error: err.message,
            attempt,
            elapsedMs: Date.now() - start,
          }
        }
        // wait a bit before retry
        await new Promise((r) => setTimeout(r, 500 * attempt))
      } finally {
        clearTimeout(timer)
      }
    }
    return { success: false, error: "Unknown failure" }
  }
}
