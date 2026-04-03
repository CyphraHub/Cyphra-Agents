import React from "react"

interface MarketSentimentWidgetProps {
  sentimentScore: number // value from 0 to 100
  trend: "Bullish" | "Bearish" | "Neutral"
  dominantToken: string
  totalVolume24h: number
  updatedAt?: number
}

const getSentimentColor = (score: number) => {
  if (score >= 70) return "#4caf50" // green
  if (score >= 40) return "#ff9800" // orange
  return "#f44336" // red
}

const getTrendEmoji = (trend: MarketSentimentWidgetProps["trend"]) => {
  switch (trend) {
    case "Bullish":
      return "📈"
    case "Bearish":
      return "📉"
    default:
      return "⚖️"
  }
}

export const MarketSentimentWidget: React.FC<MarketSentimentWidgetProps> = ({
  sentimentScore,
  trend,
  dominantToken,
  totalVolume24h,
  updatedAt,
}) => {
  return (
    <div className="market-sentiment-widget p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        Market Sentiment {getTrendEmoji(trend)}
      </h3>
      <div className="sentiment-info flex gap-4 items-center">
        <div
          className="score-circle flex items-center justify-center text-white font-bold rounded-full w-16 h-16"
          style={{ backgroundColor: getSentimentColor(sentimentScore) }}
        >
          {sentimentScore}%
        </div>
        <ul className="sentiment-details text-sm space-y-1">
          <li>
            <strong>Trend:</strong> {trend}
          </li>
          <li>
            <strong>Dominant Token:</strong> {dominantToken}
          </li>
          <li>
            <strong>24h Volume:</strong> ${totalVolume24h.toLocaleString()}
          </li>
          {updatedAt && (
            <li className="text-gray-500 text-xs">
              Updated: {new Date(updatedAt).toLocaleTimeString()}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
