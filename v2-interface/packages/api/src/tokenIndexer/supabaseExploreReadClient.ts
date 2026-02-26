interface SupabaseExploreReadClientConfig {
  readonly supabaseUrl: string
  readonly anonKey: string
  readonly schema?: string
  readonly fetchImpl?: typeof fetch
}

interface ExploreTokenRow {
  readonly chain_id: number
  readonly address: string
  readonly symbol?: string
  readonly name?: string
  readonly decimals?: number | string
  readonly logo_uri?: string | null
  readonly verified?: boolean
  readonly source_primary?: string
  readonly liquidity_usd?: number | string
  readonly volume_24h_usd?: number | string
  readonly price_usd?: number | string
  readonly price_change_1h_pct?: number | string
  readonly price_change_1d_pct?: number | string
  readonly fdv_usd?: number | string
  readonly volume_1h_usd?: number | string
  readonly volume_1w_usd?: number | string
  readonly volume_1m_usd?: number | string
  readonly volume_1y_usd?: number | string
  readonly sparkline_1d?: number[]
  readonly updated_at: string
}

interface ExplorePoolRow {
  readonly chain_id: number
  readonly address: string
  readonly protocol_version?: string
  readonly fee_tier_bps?: number | string
  readonly token0_address: string
  readonly token1_address: string
  readonly token0_symbol: string
  readonly token1_symbol: string
  readonly token0_name: string
  readonly token1_name: string
  readonly token0_decimals: number | string
  readonly token1_decimals: number | string
  readonly token0_logo_uri?: string | null
  readonly token1_logo_uri?: string | null
  readonly tvl_usd?: number | string
  readonly volume_24h_usd?: number | string
  readonly volume_30d_usd?: number | string
  readonly boosted_apr?: number | string
  readonly updated_at: string
}

interface ExplorePoolTotalRow {
  readonly chain_id: number
  readonly total_tvl_usd?: number | string
  readonly updated_at: string
}

interface UserV2PositionRow {
  readonly chain_id: number
  readonly wallet_address: string
  readonly pair_address: string
  readonly token0_address: string
  readonly token1_address: string
  readonly token0_symbol: string
  readonly token1_symbol: string
  readonly token0_decimals: number | string
  readonly token1_decimals: number | string
  readonly user_amount0_raw: string
  readonly user_amount1_raw: string
  readonly lp_balance_raw: string
  readonly pool_share_ratio: number | string
  readonly updated_at: string
}

export interface ExploreTokenReadModel {
  readonly chainId: number
  readonly address: string
  readonly symbol: string
  readonly name: string
  readonly decimals: number
  readonly logoUri: string | null
  readonly verified: boolean
  readonly sourcePrimary: string
  readonly liquidityUsd: number
  readonly volume24hUsd: number
  readonly priceUsd: number
  readonly priceChange1hPct: number
  readonly priceChange1dPct: number
  readonly fdvUsd: number
  readonly volume1hUsd: number
  readonly volume1wUsd: number
  readonly volume1mUsd: number
  readonly volume1yUsd: number
  readonly sparkline1d: readonly number[]
  readonly updatedAt: string
}

export interface ExplorePoolReadModel {
  readonly chainId: number
  readonly address: string
  readonly protocolVersion: string
  readonly feeTierBps?: number
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
  readonly boostedApr?: number
  readonly updatedAt: string
}

export interface SupabaseExploreReadClient {
  listTopTokens(params: { chainId: number; limit: number }): Promise<ExploreTokenReadModel[]>
  listTopPools(params: { chainId: number; limit: number; protocolVersion?: string }): Promise<ExplorePoolReadModel[]>
  getTotalTvl(params: { chainId: number }): Promise<number>
  listUserV2Positions(params: { chainId: number; walletAddress: string; limit?: number }): Promise<UserV2PositionReadModel[]>
}

export interface UserV2PositionReadModel {
  readonly chainId: number
  readonly walletAddress: string
  readonly pairAddress: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly userAmount0Raw: string
  readonly userAmount1Raw: string
  readonly lpBalanceRaw: string
  readonly poolShareRatio: number
  readonly updatedAt: string
}

function buildHeaders(config: SupabaseExploreReadClientConfig): HeadersInit {
  return {
    apikey: config.anonKey,
    authorization: `Bearer ${config.anonKey}`,
    'content-profile': config.schema ?? 'public',
    'accept-profile': config.schema ?? 'public',
  }
}

function normalizeSparkline(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
}

function toFiniteNumber(value: number | string | undefined | null): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toFiniteInteger(value: number | string | undefined | null, fallback: number): number {
  const parsed = toFiniteNumber(value)
  if (parsed === undefined) {
    return fallback
  }
  return Math.trunc(parsed)
}

function toExploreTokenReadModel(row: ExploreTokenRow): ExploreTokenReadModel {
  return {
    chainId: row.chain_id,
    address: row.address,
    symbol: row.symbol ?? '',
    name: row.name ?? '',
    decimals: toFiniteInteger(row.decimals, 18),
    logoUri: row.logo_uri ?? null,
    verified: row.verified ?? false,
    sourcePrimary: row.source_primary ?? '',
    liquidityUsd: toFiniteNumber(row.liquidity_usd) ?? 0,
    volume24hUsd: toFiniteNumber(row.volume_24h_usd) ?? 0,
    priceUsd: toFiniteNumber(row.price_usd) ?? 0,
    priceChange1hPct: toFiniteNumber(row.price_change_1h_pct) ?? 0,
    priceChange1dPct: toFiniteNumber(row.price_change_1d_pct) ?? 0,
    fdvUsd: toFiniteNumber(row.fdv_usd) ?? 0,
    volume1hUsd: toFiniteNumber(row.volume_1h_usd) ?? 0,
    volume1wUsd: toFiniteNumber(row.volume_1w_usd) ?? 0,
    volume1mUsd: toFiniteNumber(row.volume_1m_usd) ?? 0,
    volume1yUsd: toFiniteNumber(row.volume_1y_usd) ?? 0,
    sparkline1d: normalizeSparkline(row.sparkline_1d),
    updatedAt: row.updated_at,
  }
}

function toExplorePoolReadModel(row: ExplorePoolRow): ExplorePoolReadModel {
  return {
    chainId: row.chain_id,
    address: row.address,
    protocolVersion: row.protocol_version ?? 'v2',
    feeTierBps: toFiniteNumber(row.fee_tier_bps),
    token0Address: row.token0_address,
    token1Address: row.token1_address,
    token0Symbol: row.token0_symbol,
    token1Symbol: row.token1_symbol,
    token0Name: row.token0_name,
    token1Name: row.token1_name,
    token0Decimals: toFiniteInteger(row.token0_decimals, 18),
    token1Decimals: toFiniteInteger(row.token1_decimals, 18),
    token0LogoUri: row.token0_logo_uri ?? null,
    token1LogoUri: row.token1_logo_uri ?? null,
    tvlUsd: toFiniteNumber(row.tvl_usd) ?? 0,
    volume24hUsd: toFiniteNumber(row.volume_24h_usd) ?? 0,
    volume30dUsd: toFiniteNumber(row.volume_30d_usd) ?? 0,
    boostedApr: toFiniteNumber(row.boosted_apr),
    updatedAt: row.updated_at,
  }
}

function toUserV2PositionReadModel(row: UserV2PositionRow): UserV2PositionReadModel {
  return {
    chainId: row.chain_id,
    walletAddress: row.wallet_address,
    pairAddress: row.pair_address,
    token0Address: row.token0_address,
    token1Address: row.token1_address,
    token0Symbol: row.token0_symbol,
    token1Symbol: row.token1_symbol,
    token0Decimals: toFiniteInteger(row.token0_decimals, 18),
    token1Decimals: toFiniteInteger(row.token1_decimals, 18),
    userAmount0Raw: row.user_amount0_raw,
    userAmount1Raw: row.user_amount1_raw,
    lpBalanceRaw: row.lp_balance_raw,
    poolShareRatio: toFiniteNumber(row.pool_share_ratio) ?? 0,
    updatedAt: row.updated_at,
  }
}

async function fetchRows<T extends { readonly updated_at: string }>(params: {
  readonly fetchImpl: typeof fetch
  readonly url: string
  readonly headers: HeadersInit
}): Promise<T[]> {
  const response = await params.fetchImpl(params.url, { headers: params.headers })

  if (!response.ok) {
    throw new Error(`Supabase explore read failed: ${response.status} ${await response.text()}`)
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((row): row is T => typeof row === 'object' && row !== null && 'updated_at' in row)
}

export function createSupabaseExploreReadClient(config: SupabaseExploreReadClientConfig): SupabaseExploreReadClient {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const baseUrl = config.supabaseUrl.replace(/\/$/, '')
  const headers = buildHeaders(config)

  return {
    async listTopTokens(params: { chainId: number; limit: number }): Promise<ExploreTokenReadModel[]> {
      const url =
        `${baseUrl}/rest/v1/v_token_search_public?chain_id=eq.${params.chainId}` +
        `&order=rank_score.desc,verified.desc,priority.desc,symbol.asc&limit=${params.limit}` +
        '&select=chain_id,address,symbol,name,decimals,logo_uri,verified,source_primary,liquidity_usd,volume_24h_usd,price_usd,price_change_1h_pct,price_change_1d_pct,fdv_usd,volume_1h_usd,volume_1w_usd,volume_1m_usd,volume_1y_usd,sparkline_1d,updated_at'
      const rows = await fetchRows<ExploreTokenRow>({ fetchImpl, url, headers })
      return rows.map(toExploreTokenReadModel)
    },

    async listTopPools(params: { chainId: number; limit: number; protocolVersion?: string }): Promise<ExplorePoolReadModel[]> {
      const protocolFilter =
        params.protocolVersion && params.protocolVersion.length > 0
          ? `&protocol_version=eq.${encodeURIComponent(params.protocolVersion)}`
          : ''
      const url = `${baseUrl}/rest/v1/v_pool_market_snapshot_public?chain_id=eq.${params.chainId}${protocolFilter}&order=tvl_usd.desc&limit=${params.limit}&select=chain_id,address,protocol_version,fee_tier_bps,token0_address,token1_address,token0_symbol,token1_symbol,token0_name,token1_name,token0_decimals,token1_decimals,token0_logo_uri,token1_logo_uri,tvl_usd,volume_24h_usd,volume_30d_usd,boosted_apr,updated_at`
      const rows = await fetchRows<ExplorePoolRow>({ fetchImpl, url, headers })
      return rows.map(toExplorePoolReadModel)
    },

    async getTotalTvl(params: { chainId: number }): Promise<number> {
      const url = `${baseUrl}/rest/v1/v_pool_market_totals_public?chain_id=eq.${params.chainId}&select=chain_id,total_tvl_usd,updated_at&limit=1`
      const rows = await fetchRows<ExplorePoolTotalRow>({ fetchImpl, url, headers })
      const row = rows[0]
      return toFiniteNumber(row?.total_tvl_usd) ?? 0
    },

    async listUserV2Positions(params: {
      chainId: number
      walletAddress: string
      limit?: number
    }): Promise<UserV2PositionReadModel[]> {
      const limit = params.limit ?? 1000
      const url =
        `${baseUrl}/rest/v1/v_v2_user_lp_positions_public?` +
        `chain_id=eq.${params.chainId}&wallet_address=eq.${params.walletAddress.toLowerCase()}` +
        `&order=updated_at.desc&limit=${limit}` +
        '&select=chain_id,wallet_address,pair_address,token0_address,token1_address,token0_symbol,token1_symbol,token0_decimals,token1_decimals,user_amount0_raw,user_amount1_raw,lp_balance_raw,pool_share_ratio,updated_at'
      const rows = await fetchRows<UserV2PositionRow>({ fetchImpl, url, headers })
      return rows.map(toUserV2PositionReadModel)
    },
  }
}
