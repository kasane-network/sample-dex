import {
  TokenMarketSnapshotRecord,
  TokenRegistryRecord,
  TokenSearchIndexRecord,
} from '@universe/api/src/tokenIndexer/types'

interface SupabaseReadClientConfig {
  readonly supabaseUrl: string
  readonly anonKey: string
  readonly schema?: string
  readonly fetchImpl?: typeof fetch
}

interface TokenReadRow {
  readonly chain_id: number
  readonly address: string
  readonly symbol?: string
  readonly name?: string
  readonly decimals?: number
  readonly logo_uri?: string | null
  readonly verified?: boolean
  readonly is_spam?: boolean
  readonly priority?: number
  readonly source_primary?: string
  readonly liquidity_usd?: number
  readonly volume_24h_usd?: number
  readonly search_text?: string
  readonly rank_score?: number
  readonly updated_at: string
}

export interface TokenReadModel {
  readonly registry: TokenRegistryRecord
  readonly market: Pick<TokenMarketSnapshotRecord, 'liquidityUsd' | 'volume24hUsd' | 'updatedAt'>
  readonly search: Pick<TokenSearchIndexRecord, 'searchText' | 'rankScore' | 'updatedAt'>
}

export interface SupabaseTokenReadClient {
  listTokens(params: { chainId: number; limit: number }): Promise<TokenReadModel[]>
  searchTokens(params: { chainId: number; query: string; limit: number }): Promise<TokenReadModel[]>
}

function buildHeaders(config: SupabaseReadClientConfig): HeadersInit {
  return {
    apikey: config.anonKey,
    authorization: `Bearer ${config.anonKey}`,
    'content-profile': config.schema ?? 'public',
    'accept-profile': config.schema ?? 'public',
  }
}

function toTokenReadModel(row: TokenReadRow): TokenReadModel {
  return {
    registry: {
      chainId: row.chain_id,
      address: row.address,
      symbol: row.symbol ?? '',
      name: row.name ?? '',
      decimals: row.decimals ?? 0,
      logoUri: row.logo_uri ?? null,
      verified: row.verified ?? false,
      isSpam: row.is_spam ?? false,
      priority: row.priority ?? 0,
      sourcePrimary: row.source_primary ?? '',
      updatedAt: row.updated_at,
    },
    market: {
      liquidityUsd: row.liquidity_usd ?? 0,
      volume24hUsd: row.volume_24h_usd ?? 0,
      updatedAt: row.updated_at,
    },
    search: {
      searchText: row.search_text ?? '',
      rankScore: row.rank_score ?? 0,
      updatedAt: row.updated_at,
    },
  }
}

async function fetchRows(params: {
  readonly fetchImpl: typeof fetch
  readonly url: string
  readonly headers: HeadersInit
}): Promise<TokenReadRow[]> {
  const response = await params.fetchImpl(params.url, { headers: params.headers })

  if (!response.ok) {
    throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`)
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((row): row is TokenReadRow => typeof row === 'object' && row !== null && 'updated_at' in row)
}

export function createSupabaseTokenReadClient(config: SupabaseReadClientConfig): SupabaseTokenReadClient {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const baseUrl = config.supabaseUrl.replace(/\/$/, '')
  const headers = buildHeaders(config)

  return {
    async listTokens(params: { chainId: number; limit: number }): Promise<TokenReadModel[]> {
      const url = `${baseUrl}/rest/v1/v_token_registry_public?chain_id=eq.${params.chainId}&order=verified.desc,priority.desc,symbol.asc&limit=${params.limit}&select=chain_id,address,symbol,name,decimals,logo_uri,verified,priority,source_primary,updated_at`
      const rows = await fetchRows({ fetchImpl, url, headers })
      return rows.map(toTokenReadModel)
    },

    async searchTokens(params: { chainId: number; query: string; limit: number }): Promise<TokenReadModel[]> {
      const escapedQuery = encodeURIComponent(`%${params.query.toLowerCase()}%`)
      const url = `${baseUrl}/rest/v1/v_token_registry_public?chain_id=eq.${params.chainId}&or=(symbol.ilike.${escapedQuery},name.ilike.${escapedQuery},address.ilike.${escapedQuery})&order=verified.desc,priority.desc,symbol.asc&limit=${params.limit}&select=chain_id,address,symbol,name,decimals,logo_uri,verified,priority,source_primary,updated_at`
      const rows = await fetchRows({ fetchImpl, url, headers })
      return rows.map(toTokenReadModel)
    },
  }
}
