import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
  refreshIntervalMs?: number
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
  updatedAt?: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({
  assetId,
  refreshIntervalMs = 30_000,
}) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    async function fetchInfo() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`)
        if (!res.ok) throw new Error(`Failed to fetch asset ${assetId}: ${res.status}`)
        const json = (await res.json()) as AssetOverview
        setInfo({ ...json, updatedAt: Date.now() })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInfo()
    if (refreshIntervalMs > 0) {
      timer = setInterval(fetchInfo, refreshIntervalMs)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [assetId, refreshIntervalMs])

  if (loading && !info) return <div>Loading asset overview...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>
  if (!info) return <div>No data available</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
      {info.updatedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Updated: {new Date(info.updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

export default AssetOverviewPanel
