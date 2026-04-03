import React from "react"
import SentimentGauge from "./SentimentGauge"
import AssetOverviewPanel from "./AssetOverviewPanel"

/**
 * Main analytics dashboard: combines sentiment, asset overview, and whale tracking.
 */
export const AnalyticsDashboard: React.FC = () => (
  <div className="p-8 bg-gray-100 min-h-screen">
    <header className="mb-6">
      <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
      <p className="text-gray-600">Real-time insights into market sentiment and asset activity</p>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-1">
        <SentimentGauge symbol="SOL" />
      </div>
      <div className="col-span-1">
        <AssetOverviewPanel assetId="sol-01" refreshIntervalMs={60_000} />
      </div>
      <div className="col-span-1">
        {/* Placeholder card until WhaleTrackerCard is implemented */}
        <div className="p-4 bg-white rounded shadow flex flex-col items-start">
          <h2 className="text-lg font-semibold mb-2">Whale Tracker</h2>
          <p className="text-gray-600 text-sm">
            Tracking large wallet movements across top liquidity pools…
          </p>
          <button
            className="mt-3 px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
            onClick={() => alert("Coming soon")}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  </div>
)

export default AnalyticsDashboard
