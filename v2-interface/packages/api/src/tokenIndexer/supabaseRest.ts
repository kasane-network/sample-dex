import {
  ExploreSnapshotRepository,
  PoolMarketSnapshotRecord,
  V2UserLpPositionRecord,
  V2UserPositionsRepository,
  TokenMarketEnrichmentRecord,
  TokenIndexerRepository,
  TokenMarketSnapshotRecord,
  TokenRegistryRecord,
  TokenSearchIndexRecord,
} from '@universe/api/src/tokenIndexer/types'

interface SupabaseRepositoryConfig {
  readonly supabaseUrl: string
  readonly serviceRoleKey: string
  readonly schema?: string
  readonly fetchImpl?: typeof fetch
}

function tableUrl(params: {
  readonly baseUrl: string
  readonly tableName: string
  readonly onConflict: readonly string[]
}): string {
  return `${params.baseUrl}/rest/v1/${params.tableName}?on_conflict=${params.onConflict.join(',')}`
}

function toPostgrestPayload(records: readonly TokenRegistryRecord[]): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    symbol: record.symbol,
    name: record.name,
    decimals: record.decimals,
    logo_uri: record.logoUri,
    verified: record.verified,
    is_spam: record.isSpam,
    priority: record.priority,
    source_primary: record.sourcePrimary,
    updated_at: record.updatedAt,
  }))
}

function toMarketPayload(records: readonly TokenMarketSnapshotRecord[]): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    liquidity_usd: record.liquidityUsd,
    volume_24h_usd: record.volume24hUsd,
    updated_at: record.updatedAt,
  }))
}

function toSearchPayload(records: readonly TokenSearchIndexRecord[]): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    search_text: record.searchText,
    rank_score: record.rankScore,
    updated_at: record.updatedAt,
  }))
}

function toTokenMarketEnrichmentPayload(
  records: readonly TokenMarketEnrichmentRecord[],
): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => {
    const payload: Record<string, unknown> = {
      chain_id: record.chainId,
      address: record.address,
      updated_at: record.updatedAt,
    }

    if (record.priceUsd !== undefined) payload.price_usd = record.priceUsd
    if (record.priceChange1hPct !== undefined) payload.price_change_1h_pct = record.priceChange1hPct
    if (record.priceChange1dPct !== undefined) payload.price_change_1d_pct = record.priceChange1dPct
    if (record.fdvUsd !== undefined) payload.fdv_usd = record.fdvUsd
    if (record.volume1hUsd !== undefined) payload.volume_1h_usd = record.volume1hUsd
    if (record.volume24hUsd !== undefined) payload.volume_24h_usd = record.volume24hUsd
    if (record.volume1wUsd !== undefined) payload.volume_1w_usd = record.volume1wUsd
    if (record.volume1mUsd !== undefined) payload.volume_1m_usd = record.volume1mUsd
    if (record.volume1yUsd !== undefined) payload.volume_1y_usd = record.volume1yUsd
    if (record.sparkline1d !== undefined) payload.sparkline_1d = record.sparkline1d

    return payload
  })
}

function toPoolMarketPayload(records: readonly PoolMarketSnapshotRecord[]): ReadonlyArray<Record<string, unknown>> {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    protocol_version: record.protocolVersion,
    fee_tier_bps: record.feeTierBps,
    token0_address: record.token0Address,
    token1_address: record.token1Address,
    token0_symbol: record.token0Symbol,
    token1_symbol: record.token1Symbol,
    token0_name: record.token0Name,
    token1_name: record.token1Name,
    token0_decimals: record.token0Decimals,
    token1_decimals: record.token1Decimals,
    token0_logo_uri: record.token0LogoUri,
    token1_logo_uri: record.token1LogoUri,
    tvl_usd: record.tvlUsd,
    volume_24h_usd: record.volume24hUsd,
    volume_30d_usd: record.volume30dUsd,
    boosted_apr: record.boostedApr,
    updated_at: record.updatedAt,
  }))
}

async function postgrestUpsert(params: {
  readonly fetchImpl: typeof fetch
  readonly baseUrl: string
  readonly serviceRoleKey: string
  readonly schema: string
  readonly tableName: string
  readonly onConflict: readonly string[]
  readonly payload: ReadonlyArray<Record<string, unknown>>
}): Promise<void> {
  if (params.payload.length === 0) {
    return
  }

  const response = await params.fetchImpl(
    tableUrl({
      baseUrl: params.baseUrl,
      tableName: params.tableName,
      onConflict: params.onConflict,
    }),
    {
      method: 'POST',
      headers: {
        apikey: params.serviceRoleKey,
      authorization: `Bearer ${params.serviceRoleKey}`,
      'content-type': 'application/json',
      'content-profile': params.schema,
      'accept-profile': params.schema,
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
      body: JSON.stringify(params.payload),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`PostgREST upsert failed for ${params.tableName}: ${response.status} ${message}`)
  }
}

export class SupabaseTokenIndexerRepository
  implements TokenIndexerRepository, ExploreSnapshotRepository, V2UserPositionsRepository
{
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly serviceRoleKey: string
  private readonly schema: string

  constructor(config: SupabaseRepositoryConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
    this.baseUrl = config.supabaseUrl.replace(/\/$/, '')
    this.serviceRoleKey = config.serviceRoleKey
    this.schema = config.schema ?? 'public'
  }

  async upsertTokenRegistry(records: readonly TokenRegistryRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'token_registry',
      onConflict: ['chain_id', 'address'],
      payload: toPostgrestPayload(records),
    })
  }

  async upsertTokenMarketSnapshot(records: readonly TokenMarketSnapshotRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'token_market_snapshot',
      onConflict: ['chain_id', 'address'],
      payload: toMarketPayload(records),
    })
  }

  async upsertTokenSearchIndex(records: readonly TokenSearchIndexRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'token_search_index',
      onConflict: ['chain_id', 'address'],
      payload: toSearchPayload(records),
    })
  }

  async upsertTokenMarketEnrichment(records: readonly TokenMarketEnrichmentRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'token_market_snapshot',
      onConflict: ['chain_id', 'address'],
      payload: toTokenMarketEnrichmentPayload(records),
    })
  }

  async upsertPoolMarketSnapshot(records: readonly PoolMarketSnapshotRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'pool_market_snapshot',
      onConflict: ['chain_id', 'address'],
      payload: toPoolMarketPayload(records),
    })
  }

  async upsertV2UserLpPositions(records: readonly V2UserLpPositionRecord[]): Promise<void> {
    await postgrestUpsert({
      fetchImpl: this.fetchImpl,
      baseUrl: this.baseUrl,
      serviceRoleKey: this.serviceRoleKey,
      schema: this.schema,
      tableName: 'v2_user_lp_positions',
      onConflict: ['chain_id', 'wallet_address', 'pair_address'],
      payload: records.map((record) => ({
        chain_id: record.chainId,
        wallet_address: record.walletAddress,
        pair_address: record.pairAddress,
        lp_balance_raw: record.lpBalanceRaw,
        lp_total_supply_raw: record.lpTotalSupplyRaw,
        reserve0_raw: record.reserve0Raw,
        reserve1_raw: record.reserve1Raw,
        token0_address: record.token0Address,
        token1_address: record.token1Address,
        token0_symbol: record.token0Symbol,
        token1_symbol: record.token1Symbol,
        token0_decimals: record.token0Decimals,
        token1_decimals: record.token1Decimals,
        user_amount0_raw: record.userAmount0Raw,
        user_amount1_raw: record.userAmount1Raw,
        updated_at: record.updatedAt,
      })),
    })
  }

  async deleteMissingV2UserLpPositions(params: {
    readonly chainId: number
    readonly walletAddress: string
    readonly keepPairAddresses: readonly string[]
  }): Promise<void> {
    const base =
      `${this.baseUrl}/rest/v1/v2_user_lp_positions?` +
      `chain_id=eq.${params.chainId}&wallet_address=eq.${params.walletAddress.toLowerCase()}`
    const url =
      params.keepPairAddresses.length > 0
        ? `${base}&pair_address=not.in.(${params.keepPairAddresses.map((address) => address.toLowerCase()).join(',')})`
        : base

    const response = await this.fetchImpl(url, {
      method: 'DELETE',
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
        'content-profile': this.schema,
        'accept-profile': this.schema,
        prefer: 'return=minimal',
      },
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`PostgREST delete failed for v2_user_lp_positions: ${response.status} ${message}`)
    }
  }
}
