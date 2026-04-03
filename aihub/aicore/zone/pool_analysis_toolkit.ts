import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

export interface LiquidityToolMeta {
  key: string
  description: string
  category: "fetch" | "analyze"
}

export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

export const LIQUIDITY_ANALYSIS_META: Record<string, LiquidityToolMeta> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: {
    key: FETCH_POOL_DATA_KEY,
    description: "Fetch raw on-chain liquidity pool data (reserves, tokens, volume, fees)",
    category: "fetch",
  },
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: {
    key: ANALYZE_POOL_HEALTH_KEY,
    description: "Perform health and risk analysis on a given liquidity pool",
    category: "analyze",
  },
})

/**
 * Utility to list all available liquidity analysis tools with their metadata
 */
export function listLiquidityTools(): LiquidityToolMeta[] {
  return Object.values(LIQUIDITY_ANALYSIS_META)
}
