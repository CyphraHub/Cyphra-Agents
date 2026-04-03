import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  /** Restrict postMessage target origin (recommended). Defaults to "*" */
  targetOrigin?: string
  /** Optional HTML iframe sandbox attribute (space-separated tokens) */
  sandbox?: string
  /** Expect an ACK message back after posting metrics */
  enableAck?: boolean
  /** Warn if no ACK within this timeout (ms). Default: 3000 */
  ackTimeoutMs?: number
}

type AckMessage = { type: "TOKEN_ANALYSIS_ACK"; receivedAt?: number }

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private refreshTimer: number | null = null
  private ackTimer: number | null = null
  private onMessageBound = (e: MessageEvent) => this.onMessage(e)
  private inited = false

  constructor(private config: IframeConfig) {}

  init(): void {
    if (this.inited) return
    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.style.border = "0"
    iframe.setAttribute("loading", "lazy")
    if (this.config.sandbox) iframe.setAttribute("sandbox", this.config.sandbox)
    iframe.onload = () => this.postMetrics()

    container.appendChild(iframe)
    this.iframeEl = iframe
    window.addEventListener("message", this.onMessageBound)
    this.inited = true

    if (this.config.refreshIntervalMs && this.config.refreshIntervalMs > 0) {
      this.refreshTimer = window.setInterval(
        () => this.postMetrics(),
        this.config.refreshIntervalMs
      )
    }
  }

  /** Update metrics and immediately post them */
  updateMetrics(next: TokenMetrics): void {
    this.config.metrics = next
    this.postMetrics()
  }

  /** Change iframe URL and re-send metrics on load */
  setSrc(nextUrl: string): void {
    if (!this.iframeEl) return
    this.iframeEl.onload = () => this.postMetrics()
    this.iframeEl.src = nextUrl
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    const target = this.config.targetOrigin ?? "*"
    this.clearAckTimer()
    this.iframeEl.contentWindow.postMessage(
      { type: "TOKEN_ANALYSIS_METRICS", payload: this.config.metrics },
      target
    )
    if (this.config.enableAck) {
      const t = Math.max(0, this.config.ackTimeoutMs ?? 3000)
      this.ackTimer = window.setTimeout(() => {
        console.warn("No ACK from iframe within", t, "ms")
      }, t)
    }
  }

  private onMessage(e: MessageEvent): void {
    // Enforce origin if specified
    if (this.config.targetOrigin && e.origin !== this.config.targetOrigin) return
    const data = e.data as AckMessage | unknown
    if (isAck(data)) {
      this.clearAckTimer()
    }
  }

  private clearAckTimer(): void {
    if (this.ackTimer !== null) {
      window.clearTimeout(this.ackTimer)
      this.ackTimer = null
    }
  }

  /** Cleanup timers, listeners, and DOM node */
  destroy(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    this.clearAckTimer()
    window.removeEventListener("message", this.onMessageBound)
    if (this.iframeEl?.parentElement) this.iframeEl.parentElement.removeChild(this.iframeEl)
    this.iframeEl = null
    this.inited = false
  }
}

function isAck(v: unknown): v is AckMessage {
  return typeof v === "object" && v !== null && (v as any).type === "TOKEN_ANALYSIS_ACK"
}
