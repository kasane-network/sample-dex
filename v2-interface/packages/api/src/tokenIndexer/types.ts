// where: @universe/api token indexer domain types
// what: Shared types for token normalization, market snapshots, and persistence payloads
// why: Keep indexer stages strongly typed and decision-complete without any/unsafe casts

import type { Address } from 'viem'

export interface TokenListToken {
  readonly chainId: number
  readonly address: string
  readonly symbol: string
  readonly name: string
  readonly decimals: number
  readonly logoURI?: string
}

export interface TokenListSource {
  readonly sourceName: string
  readonly tokens: readonly TokenListToken[]
}

export interface TokenRegistryRecord {
  readonly chainId: number
  readonly address: string
  readonly symbol: string
  readonly name: string
  readonly decimals: number
  readonly logoUri: string | null
  readonly verified: boolean
  readonly isSpam: boolean
  readonly priority: number
  readonly sourcePrimary: string
  readonly updatedAt: string
}

export interface TokenMarketSnapshotRecord {
  readonly chainId: number
  readonly address: string
  readonly liquidityUsd: number
  readonly volume24hUsd: number
  readonly updatedAt: string
}

export interface TokenSearchIndexRecord {
  readonly chainId: number
  readonly address: string
  readonly searchText: string
  readonly rankScore: number
  readonly updatedAt: string
}

export interface TokenMarketEnrichmentRecord {
  readonly chainId: number
  readonly address: string
  readonly priceUsd?: number
  readonly priceChange1hPct?: number
  readonly priceChange1dPct?: number
  readonly fdvUsd?: number
  readonly volume1hUsd?: number
  readonly volume24hUsd?: number
  readonly volume1wUsd?: number
  readonly volume1mUsd?: number
  readonly volume1yUsd?: number
  readonly sparkline1d?: readonly number[]
  readonly updatedAt: string
}

export interface PoolMarketSnapshotRecord {
  readonly chainId: number
  readonly address: string
  readonly protocolVersion: string
  readonly feeTierBps: number | null
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Name: string
  readonly token1Name: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly token0LogoUri: string | null
  readonly token1LogoUri: string | null
  readonly tvlUsd: number
  readonly volume24hUsd: number
  readonly volume30dUsd: number
  readonly boostedApr: number | null
  readonly updatedAt: string
}

export interface V2UserLpPositionRecord {
  readonly chainId: number
  readonly walletAddress: string
  readonly pairAddress: string
  readonly lpBalanceRaw: string
  readonly lpTotalSupplyRaw: string
  readonly reserve0Raw: string
  readonly reserve1Raw: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly userAmount0Raw: string
  readonly userAmount1Raw: string
  readonly updatedAt: string
}

export interface TokenOverrides {
  readonly verified?: boolean
  readonly isSpam?: boolean
  readonly priority?: number
}

export interface RankWeights {
  readonly verifiedBonus: number
  readonly liquidityWeight: number
  readonly volumeWeight: number
  readonly spamPenalty: number
}

export interface V2PoolSpec {
  readonly poolAddress: Address
  readonly token0Address: Address
  readonly token1Address: Address
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly token0IsStableUsd: boolean
  readonly token1IsStableUsd: boolean
}

export interface RpcMarketCollectorConfig {
  readonly chainId: number
  readonly rpcUrl: string
  readonly pools: readonly V2PoolSpec[]
  readonly maxPoolVolume24hUsd?: number
}

export interface MarketCollectionResult {
  readonly snapshots: readonly TokenMarketSnapshotRecord[]
  readonly failedPoolAddresses: readonly string[]
}

export interface TokenIndexerRepository {
  upsertTokenRegistry(records: readonly TokenRegistryRecord[]): Promise<void>
  upsertTokenMarketSnapshot(records: readonly TokenMarketSnapshotRecord[]): Promise<void>
  upsertTokenSearchIndex(records: readonly TokenSearchIndexRecord[]): Promise<void>
}

export interface ExploreSnapshotRepository {
  upsertTokenMarketEnrichment(records: readonly TokenMarketEnrichmentRecord[]): Promise<void>
  upsertPoolMarketSnapshot(records: readonly PoolMarketSnapshotRecord[]): Promise<void>
}

export interface V2UserPositionsRepository {
  upsertV2UserLpPositions(records: readonly V2UserLpPositionRecord[]): Promise<void>
  deleteMissingV2UserLpPositions(params: {
    readonly chainId: number
    readonly walletAddress: string
    readonly keepPairAddresses: readonly string[]
  }): Promise<void>
}

export interface TokenIndexerRunResult {
  readonly tokenRegistryUpserted: number
  readonly tokenMarketSnapshotUpserted: number
  readonly tokenSearchIndexUpserted: number
  readonly skippedMarketAndSearchUpdate: boolean
  readonly failedPoolAddresses: readonly string[]
}

export interface ExploreSnapshotUpdaterRunResult {
  readonly pagesFetched: number
  readonly tokenMarketEnrichmentUpserted: number
  readonly poolMarketSnapshotUpserted: number
}
