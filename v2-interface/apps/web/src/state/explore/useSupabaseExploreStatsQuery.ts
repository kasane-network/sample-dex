import { useQuery, UseQueryResult } from '@tanstack/react-query'
import {
  createSupabaseExploreReadClient,
  ExplorePoolReadModel,
  ExploreTokenReadModel,
  GraphQLApi,
} from '@universe/api'
import { Percent } from '@uniswap/sdk-core'
import { DEFAULT_TICK_SPACING, V2_DEFAULT_FEE_TIER } from 'uniswap/src/constants/pools'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'
import { ExploreStatsData, PoolStat, PriceHistory, TokenStat } from 'state/explore/types'

const DEFAULT_SUPABASE_URL = 'https://kvkejvvkhslmudjcvsbq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a2VqdnZraHNsbXVkamN2c2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzkwOTUsImV4cCI6MjA4NzMxNTA5NX0.DTu4KuEdJ5USpp9fm5QX2sJojkpsSdc0g6vXPnOrMYg'
const DEFAULT_LIMIT = 100
const ENABLE_SUPABASE_POOLS_VIEW = true

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toPriceHistory(values: readonly number[]): PriceHistory | undefined {
  if (values.length < 2) {
    return undefined
  }

  return {
    // One-day window sampled evenly for sparkline rendering.
    start: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
    step: Math.floor((24 * 60 * 60) / Math.max(values.length - 1, 1)),
    values: Array.from(values),
  }
}

function toTokenStat(model: ExploreTokenReadModel, chainId: UniverseChainId): TokenStat {
  const chain = toGraphQLChain(chainId)

  return {
    address: model.address,
    chain,
    symbol: model.symbol,
    name: model.name,
    decimals: model.decimals,
    logo: model.logoUri ?? undefined,
    project: { name: model.name },
    price: { value: model.priceUsd },
    pricePercentChange1Hour: { value: model.priceChange1hPct },
    pricePercentChange1Day: { value: model.priceChange1dPct },
    fullyDilutedValuation: { value: model.fdvUsd },
    volume1Hour: { value: model.volume1hUsd },
    volume1Day: { value: model.volume24hUsd },
    volume1Week: { value: model.volume1wUsd },
    volume1Month: { value: model.volume1mUsd },
    volume1Year: { value: model.volume1yUsd },
    priceHistoryDay: toPriceHistory(model.sparkline1d),
  }
}

function parseProtocolVersion(version: string): PoolStat['protocolVersion'] {
  const lowered = version.toLowerCase()
  if (lowered === 'v2') {
    return GraphQLApi.ProtocolVersion.V2
  }
  if (lowered === 'v3') {
    return GraphQLApi.ProtocolVersion.V3
  }
  if (lowered === 'v4') {
    return GraphQLApi.ProtocolVersion.V4
  }
  return undefined
}

function toPoolStat(model: ExplorePoolReadModel, chainId: UniverseChainId): PoolStat {
  const chain = toGraphQLChain(chainId)

  return {
    id: model.address,
    chain,
    protocolVersion: parseProtocolVersion(model.protocolVersion),
    feeTier: {
      feeAmount: model.feeTierBps ?? V2_DEFAULT_FEE_TIER,
      tickSpacing: DEFAULT_TICK_SPACING,
      isDynamic: false,
    },
    token0: {
      address: model.token0Address,
      chain,
      symbol: model.token0Symbol,
      name: model.token0Name,
      decimals: model.token0Decimals,
      logo: model.token0LogoUri ?? undefined,
      project: { name: model.token0Name },
    },
    token1: {
      address: model.token1Address,
      chain,
      symbol: model.token1Symbol,
      name: model.token1Name,
      decimals: model.token1Decimals,
      logo: model.token1LogoUri ?? undefined,
      project: { name: model.token1Name },
    },
    totalLiquidity: { value: model.tvlUsd },
    volume1Day: { value: model.volume24hUsd },
    volume30Day: { value: model.volume30dUsd },
    boostedApr: model.boostedApr,
    apr: new Percent(0, 1),
  }
}

function buildExploreStatsData(tokens: ExploreTokenReadModel[], pools: ExplorePoolReadModel[], chainId: UniverseChainId) {
  const tokenStats = tokens.map((token) => toTokenStat(token, chainId))
  const poolStats = pools.map((pool) => toPoolStat(pool, chainId))

  return {
    stats: {
      tokenStats,
      poolStats,
      poolStatsV2: poolStats.filter((pool) => pool.protocolVersion === GraphQLApi.ProtocolVersion.V2),
      poolStatsV3: poolStats.filter((pool) => pool.protocolVersion === GraphQLApi.ProtocolVersion.V3),
      poolStatsV4: poolStats.filter((pool) => pool.protocolVersion === GraphQLApi.ProtocolVersion.V4),
    },
  } satisfies ExploreStatsData
}

export function useSupabaseExploreStatsQuery({
  chainId,
  enabled = true,
  limit = DEFAULT_LIMIT,
}: {
  chainId: UniverseChainId
  enabled?: boolean
  limit?: number
}): UseQueryResult<ExploreStatsData, Error> {
  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl ?? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY

  return useQuery<ExploreStatsData, Error>({
    queryKey: ['explore-stats-supabase', chainId, limit],
    enabled,
    queryFn: async () => {
      const client = createSupabaseExploreReadClient({
        supabaseUrl,
        anonKey: supabaseAnonKey,
      })

      const [tokens, pools] = await Promise.all([
        client.listTopTokens({ chainId, limit }),
        ENABLE_SUPABASE_POOLS_VIEW ? client.listTopPools({ chainId, limit }) : Promise.resolve([]),
      ])

      return buildExploreStatsData(tokens, pools, chainId)
    },
  })
}

export function useSupabaseTotalTvlQuery({
  chainId,
  enabled = true,
}: {
  chainId: UniverseChainId
  enabled?: boolean
}): UseQueryResult<number, Error> {
  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl ?? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY

  return useQuery<number, Error>({
    queryKey: ['explore-total-tvl-supabase', chainId],
    enabled,
    queryFn: async () => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/v_pool_market_totals_public?chain_id=eq.${chainId}&select=total_tvl_usd&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            authorization: `Bearer ${supabaseAnonKey}`,
            'content-profile': 'public',
            'accept-profile': 'public',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Supabase total TVL read failed: ${response.status}`)
      }

      const data: unknown = await response.json()
      if (!Array.isArray(data) || data.length === 0) {
        return 0
      }

      const first = data[0]
      if (typeof first !== 'object' || first === null || !('total_tvl_usd' in first)) {
        return 0
      }

      const totalTvl = toFiniteNumber(first.total_tvl_usd)
      return totalTvl ?? 0
    },
  })
}

export function useSupabaseTotalVolume24hQuery({
  chainId,
  enabled = true,
}: {
  chainId: UniverseChainId
  enabled?: boolean
}): UseQueryResult<number, Error> {
  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl ?? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY

  return useQuery<number, Error>({
    queryKey: ['explore-total-volume-24h-supabase', chainId],
    enabled,
    queryFn: async () => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/v_pool_market_totals_public?chain_id=eq.${chainId}&select=total_volume_24h_usd&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            authorization: `Bearer ${supabaseAnonKey}`,
            'content-profile': 'public',
            'accept-profile': 'public',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Supabase total 24h volume read failed: ${response.status}`)
      }

      const data: unknown = await response.json()
      if (!Array.isArray(data) || data.length === 0) {
        return 0
      }

      const first = data[0]
      if (typeof first !== 'object' || first === null || !('total_volume_24h_usd' in first)) {
        return 0
      }

      const totalVolume = toFiniteNumber(first.total_volume_24h_usd)
      return totalVolume ?? 0
    },
  })
}
