import { createPromiseClient } from '@connectrpc/connect'
import { ExploreStatsService } from '@uniswap/client-explore/dist/uniswap/explore/v1/service_connect'
import { ExploreStatsResponse } from '@uniswap/client-explore/dist/uniswap/explore/v1/service_pb'
import { createConnectTransportWithDefaults } from '@universe/api/src/connectRpc/base'
import {
  ExploreSnapshotRepository,
  ExploreSnapshotUpdaterRunResult,
  PoolMarketSnapshotRecord,
  TokenMarketEnrichmentRecord,
} from '@universe/api/src/tokenIndexer/types'

interface AmountLike {
  readonly value: number
}

interface PriceHistoryLike {
  readonly values: readonly number[]
}

interface TokenStatsLike {
  readonly address: string
  readonly symbol?: string
  readonly name?: string
  readonly logo?: string
  readonly decimals?: number
  readonly price?: AmountLike
  readonly fullyDilutedValuation?: AmountLike
  readonly pricePercentChange1Hour?: AmountLike
  readonly pricePercentChange1Day?: AmountLike
  readonly volume1Hour?: AmountLike
  readonly volume1Day?: AmountLike
  readonly volume1Week?: AmountLike
  readonly volume1Month?: AmountLike
  readonly volume1Year?: AmountLike
  readonly priceHistoryDay?: PriceHistoryLike
}

interface PoolStatsLike {
  readonly id: string
  readonly protocolVersion?: string
  readonly feeTier?: number
  readonly token0?: TokenStatsLike
  readonly token1?: TokenStatsLike
  readonly totalLiquidity?: AmountLike
  readonly volume1Day?: AmountLike
  readonly volume30Day?: AmountLike
  readonly boostedApr?: number
}

interface TopTokensLike {
  readonly hourly: readonly TokenStatsLike[]
  readonly daily: readonly TokenStatsLike[]
  readonly weekly: readonly TokenStatsLike[]
  readonly monthly: readonly TokenStatsLike[]
  readonly yearly: readonly TokenStatsLike[]
}

interface ExploreStatsLike {
  readonly tokenStats: readonly TokenStatsLike[]
  readonly topTokens?: TopTokensLike
  readonly poolStats: readonly PoolStatsLike[]
  readonly poolStatsV2: readonly PoolStatsLike[]
  readonly poolStatsV3: readonly PoolStatsLike[]
  readonly poolStatsV4: readonly PoolStatsLike[]
}

export interface ExploreStatsPage {
  readonly stats?: ExploreStatsLike
  readonly nextPageToken?: string
}

export interface ExploreStatsPageRequest {
  readonly chain: string
  readonly pageSize: number
  readonly pageToken?: string
}

export interface ExploreStatsPageFetcher {
  (request: ExploreStatsPageRequest): Promise<ExploreStatsPage>
}

export interface ExploreSnapshotUpdaterInput {
  readonly chainId: number
  readonly chain: string
  readonly pageSize: number
  readonly maxPages: number
  readonly repository: ExploreSnapshotRepository
  readonly fetchPage: ExploreStatsPageFetcher
  readonly now?: Date
}

export interface CreateExploreStatsFetcherConfig {
  readonly baseUrl: string
  readonly apiKey?: string
}

export const DEFAULT_EXPLORE_API_BASE_URL = 'https://api.uniswap.org/v2'
export const DEFAULT_EXPLORE_PAGE_SIZE = 200
export const DEFAULT_EXPLORE_MAX_PAGES = 20

export function mapChainIdToExploreChain(chainId: number): string | undefined {
  const chainMap: Record<number, string> = {
    1: 'ETHEREUM',
    10: 'OPTIMISM',
    56: 'BNB',
    130: 'UNICHAIN',
    137: 'POLYGON',
    324: 'ZKSYNC',
    8453: 'BASE',
    42161: 'ARBITRUM',
    43114: 'AVALANCHE',
  }
  return chainMap[chainId]
}

function normalizeAddress(address: string | undefined): string {
  return (address ?? '').trim().toLowerCase()
}

function toFiniteNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toOptionalFiniteNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeSparkline(values: readonly number[] | undefined): readonly number[] {
  if (!values) {
    return []
  }
  return values.filter((value) => Number.isFinite(value))
}

function normalizeProtocolVersion(version: string | undefined, fallback: string): string {
  const normalized = (version ?? fallback).trim().toLowerCase()
  if (normalized === '2' || normalized === 'v2') {
    return 'v2'
  }
  if (normalized === '3' || normalized === 'v3') {
    return 'v3'
  }
  if (normalized === '4' || normalized === 'v4') {
    return 'v4'
  }
  return fallback
}

function collectTokenStats(stats: ExploreStatsLike | undefined): TokenStatsLike[] {
  if (!stats) {
    return []
  }

  const topTokens = stats.topTokens
  return [
    ...stats.tokenStats,
    ...(topTokens?.hourly ?? []),
    ...(topTokens?.daily ?? []),
    ...(topTokens?.weekly ?? []),
    ...(topTokens?.monthly ?? []),
    ...(topTokens?.yearly ?? []),
  ]
}

function collectPoolStats(stats: ExploreStatsLike | undefined): Array<{ readonly stat: PoolStatsLike; readonly fallback: string }> {
  if (!stats) {
    return []
  }

  const direct = stats.poolStats.map((stat) => ({ stat, fallback: 'v2' }))
  const v2 = stats.poolStatsV2.map((stat) => ({ stat, fallback: 'v2' }))
  const v3 = stats.poolStatsV3.map((stat) => ({ stat, fallback: 'v3' }))
  const v4 = stats.poolStatsV4.map((stat) => ({ stat, fallback: 'v4' }))
  return [...direct, ...v2, ...v3, ...v4]
}

function toTokenEnrichmentRecord(params: {
  readonly chainId: number
  readonly stat: TokenStatsLike
  readonly updatedAt: string
}): TokenMarketEnrichmentRecord | undefined {
  const address = normalizeAddress(params.stat.address)
  if (!address) {
    return undefined
  }

  return {
    chainId: params.chainId,
    address,
    priceUsd: toFiniteNumber(params.stat.price?.value),
    priceChange1hPct: toFiniteNumber(params.stat.pricePercentChange1Hour?.value),
    priceChange1dPct: toFiniteNumber(params.stat.pricePercentChange1Day?.value),
    fdvUsd: toFiniteNumber(params.stat.fullyDilutedValuation?.value),
    volume1hUsd: toFiniteNumber(params.stat.volume1Hour?.value),
    volume24hUsd: toFiniteNumber(params.stat.volume1Day?.value),
    volume1wUsd: toFiniteNumber(params.stat.volume1Week?.value),
    volume1mUsd: toFiniteNumber(params.stat.volume1Month?.value),
    volume1yUsd: toFiniteNumber(params.stat.volume1Year?.value),
    sparkline1d: normalizeSparkline(params.stat.priceHistoryDay?.values),
    updatedAt: params.updatedAt,
  }
}

function toPoolRecord(params: {
  readonly chainId: number
  readonly stat: PoolStatsLike
  readonly fallbackProtocolVersion: string
  readonly updatedAt: string
}): PoolMarketSnapshotRecord | undefined {
  const address = normalizeAddress(params.stat.id)
  const token0Address = normalizeAddress(params.stat.token0?.address)
  const token1Address = normalizeAddress(params.stat.token1?.address)
  if (!address || !token0Address || !token1Address) {
    return undefined
  }

  return {
    chainId: params.chainId,
    address,
    protocolVersion: normalizeProtocolVersion(params.stat.protocolVersion, params.fallbackProtocolVersion),
    feeTierBps: Number.isInteger(params.stat.feeTier) ? params.stat.feeTier ?? null : null,
    token0Address,
    token1Address,
    token0Symbol: params.stat.token0?.symbol?.trim() || 'UNKNOWN',
    token1Symbol: params.stat.token1?.symbol?.trim() || 'UNKNOWN',
    token0Name: params.stat.token0?.name?.trim() || 'Unknown Token',
    token1Name: params.stat.token1?.name?.trim() || 'Unknown Token',
    token0Decimals: params.stat.token0?.decimals ?? 18,
    token1Decimals: params.stat.token1?.decimals ?? 18,
    token0LogoUri: params.stat.token0?.logo?.trim() || null,
    token1LogoUri: params.stat.token1?.logo?.trim() || null,
    tvlUsd: toFiniteNumber(params.stat.totalLiquidity?.value),
    volume24hUsd: toFiniteNumber(params.stat.volume1Day?.value),
    volume30dUsd: toFiniteNumber(params.stat.volume30Day?.value),
    boostedApr: toOptionalFiniteNumber(params.stat.boostedApr),
    updatedAt: params.updatedAt,
  }
}

export function createExploreStatsPageFetcher(config: CreateExploreStatsFetcherConfig): ExploreStatsPageFetcher {
  const additionalHeaders = config.apiKey ? { 'x-api-key': config.apiKey } : undefined
  const client = createPromiseClient(
    ExploreStatsService,
    createConnectTransportWithDefaults({
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      additionalHeaders,
    }),
  )

  return async (request: ExploreStatsPageRequest): Promise<ExploreStatsPage> => {
    const response: ExploreStatsResponse = await client.exploreStats({
      chainId: request.chain,
      pageSize: request.pageSize,
      pageToken: request.pageToken,
    })

    return {
      stats: response.stats,
      nextPageToken: response.nextPageToken,
    }
  }
}

export async function runExploreSnapshotUpdaterCycle(
  input: ExploreSnapshotUpdaterInput,
): Promise<ExploreSnapshotUpdaterRunResult> {
  const updatedAtIso = (input.now ?? new Date()).toISOString()

  const tokenRecordsByAddress = new Map<string, TokenMarketEnrichmentRecord>()
  const poolRecordsByAddress = new Map<string, PoolMarketSnapshotRecord>()

  let pagesFetched = 0
  let pageToken: string | undefined

  while (pagesFetched < input.maxPages) {
    const page = await input.fetchPage({
      chain: input.chain,
      pageSize: input.pageSize,
      pageToken,
    })

    pagesFetched += 1

    for (const stat of collectTokenStats(page.stats)) {
      const record = toTokenEnrichmentRecord({
        chainId: input.chainId,
        stat,
        updatedAt: updatedAtIso,
      })
      if (record) {
        tokenRecordsByAddress.set(record.address, record)
      }
    }

    for (const entry of collectPoolStats(page.stats)) {
      const record = toPoolRecord({
        chainId: input.chainId,
        stat: entry.stat,
        fallbackProtocolVersion: entry.fallback,
        updatedAt: updatedAtIso,
      })
      if (record) {
        poolRecordsByAddress.set(record.address, record)
      }
    }

    const nextPageToken = page.nextPageToken?.trim() || undefined
    if (!nextPageToken || nextPageToken === pageToken) {
      break
    }
    pageToken = nextPageToken
  }

  const tokenRecords = [...tokenRecordsByAddress.values()]
  const poolRecords = [...poolRecordsByAddress.values()]

  await input.repository.upsertTokenMarketEnrichment(tokenRecords)
  await input.repository.upsertPoolMarketSnapshot(poolRecords)

  return {
    pagesFetched,
    tokenMarketEnrichmentUpserted: tokenRecords.length,
    poolMarketSnapshotUpserted: poolRecords.length,
  }
}
