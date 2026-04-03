import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

export interface ExtendedLiquidityTool {
  key: string
  label: string
  category: "fetch" | "analyze"
  description: string
}

export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

export const EXTENDED_LIQUIDITY_META: Record<string, ExtendedLiquidityTool> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: {
    key: FETCH_POOL_DATA_KEY,
    label: "Liquidity Scanner",
    category: "fetch",
    description: "Fetch detailed on-chain data for a given liquidity pool, including reserves, tokens, and trading volume.",
  },
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: {
    key: ANALYZE_POOL_HEALTH_KEY,
    label: "Pool Health Analyzer",
    category: "analyze",
    description: "Run health checks and risk analysis on liquidity pools to evaluate sustainability and potential risks.",
  },
})

/**
 * Get metadata list for UI presentation or logging
 */
export function listExtendedLiquidityTools(): ExtendedLiquidityTool[] {
  return Object.values(EXTENDED_LIQUIDITY_META)
}
