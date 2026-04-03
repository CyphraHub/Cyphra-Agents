import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  apiBase: string
  token: string
  refreshMs?: number
  maxDataPoints?: number
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private timer?: number

  constructor(private cfg: DataIframeConfig) {}

  async init(): Promise<void> {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    this.iframe = document.createElement("iframe")
    this.iframe.src = this.cfg.iframeUrl
    this.iframe.style.border = "none"
    this.iframe.width = "100%"
    this.iframe.height = "100%"
    this.iframe.onload = () => {
      void this.postTokenData()
    }
    container.appendChild(this.iframe)

    if (this.cfg.refreshMs) {
      this.timer = window.setInterval(() => this.postTokenData(), this.cfg.refreshMs)
    }
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    if (this.iframe && this.iframe.parentElement) {
      this.iframe.parentElement.removeChild(this.iframe)
    }
    this.iframe = undefined
  }

  private async postTokenData(): Promise<void> {
    if (!this.iframe?.contentWindow) return
    try {
      const { TokenDataFetcher } = await import("./tokenDataFetcher")
      const fetcher = new TokenDataFetcher(this.cfg.apiBase)
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)
      const limited =
        typeof this.cfg.maxDataPoints === "number" && this.cfg.maxDataPoints > 0
          ? data.slice(-this.cfg.maxDataPoints)
          : data

      this.iframe.contentWindow.postMessage(
        { type: "TOKEN_DATA", token: this.cfg.token, data: limited },
        "*"
      )
    } catch (err: any) {
      console.error("Failed to fetch or post token data:", err.message || err)
    }
  }
}
