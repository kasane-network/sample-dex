// where: scripts/token-indexer Supabase REST client
// what: Upsert token indexer payloads into target Supabase tables
// why: Keep writes explicit and isolated from application frontend clients

function mapRegistry(records) {
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

function mapMarket(records) {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    liquidity_usd: record.liquidityUsd,
    volume_24h_usd: record.volume24hUsd,
    updated_at: record.updatedAt,
  }))
}

function mapSearch(records) {
  return records.map((record) => ({
    chain_id: record.chainId,
    address: record.address,
    search_text: record.searchText,
    rank_score: record.rankScore,
    updated_at: record.updatedAt,
  }))
}

export class SupabaseTokenIndexerRepository {
  constructor({ supabaseUrl, serviceRoleKey, fetchImpl = fetch }) {
    this.supabaseUrl = supabaseUrl
    this.serviceRoleKey = serviceRoleKey
    this.fetchImpl = fetchImpl
  }

  async upsertTokenRegistry(records) {
    await this.#upsert('token_registry', 'chain_id,address', mapRegistry(records))
  }

  async upsertTokenMarketSnapshot(records) {
    await this.#upsert('token_market_snapshot', 'chain_id,address', mapMarket(records))
  }

  async upsertTokenSearchIndex(records) {
    await this.#upsert('token_search_index', 'chain_id,address', mapSearch(records))
  }

  async #upsert(tableName, conflictKeys, payload) {
    if (payload.length === 0) {
      return
    }

    const url = `${this.supabaseUrl}/rest/v1/${tableName}?on_conflict=${conflictKeys}`
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Supabase upsert failed table=${tableName} status=${response.status} detail=${detail}`)
    }
  }
}
