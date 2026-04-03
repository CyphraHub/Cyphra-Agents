import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
  /**
   * Minimum level to actually dispatch (default: "info")
   * e.g. if set to "warning", "info" signals are ignored
   */
  minLevel?: "info" | "warning" | "critical"
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
  meta?: Record<string, unknown>
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private shouldDispatch(level: AlertSignal["level"]): boolean {
    const order: Record<AlertSignal["level"], number> = {
      info: 0,
      warning: 1,
      critical: 2,
    }
    const min = this.cfg.minLevel ?? "info"
    return order[level] >= order[min]
  }

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? (port === 465),
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: signal.message,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const ts = new Date(signal.timestamp ?? Date.now()).toISOString()
    console.log(
      `[Alert][${signal.level.toUpperCase()}][${ts}] ${signal.title}\n${signal.message}`
    )
    if (signal.meta) {
      console.dir(signal.meta, { depth: 4 })
    }
  }

  async dispatch(signals: AlertSignal[] | AlertSignal) {
    const arr = Array.isArray(signals) ? signals : [signals]
    for (const sig of arr) {
      if (!this.shouldDispatch(sig.level)) continue
      try {
        await this.sendEmail(sig)
      } catch (err: any) {
        console.error("Failed to send alert email:", err.message ?? err)
      }
      this.logConsole(sig)
    }
  }
}
