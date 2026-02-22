// where: scripts/token-indexer ranking
// what: Compute rank_score and searchable text rows for token_search_index
// why: Make list/search ordering predictable from policy + market signals

import { buildSearchText } from './normalize.mjs'

const WEIGHTS = {
  verifiedBonus: 40,
  liquidityWeight: 10,
  volumeWeight: 6,
  spamPenalty: 100,
}

export function computeRankScore({ registry, market }) {
  const liquidity = market?.liquidityUsd ?? 0
  const volume = market?.volume24hUsd ?? 0

  let score = 0
  if (registry.verified) {
    score += WEIGHTS.verifiedBonus
  }
  score += registry.priority
  score += WEIGHTS.liquidityWeight * Math.log10(liquidity + 1)
  score += WEIGHTS.volumeWeight * Math.log10(volume + 1)
  if (registry.isSpam) {
    score -= WEIGHTS.spamPenalty
  }

  return Number(score.toFixed(6))
}

export function buildTokenSearchIndex({ tokenRegistryRecords, tokenMarketSnapshots, updatedAtIso }) {
  const marketByAddress = new Map(
    tokenMarketSnapshots.map((snapshot) => [`${snapshot.chainId}:${snapshot.address.toLowerCase()}`, snapshot]),
  )

  return tokenRegistryRecords.map((registry) => {
    const market = marketByAddress.get(`${registry.chainId}:${registry.address.toLowerCase()}`)

    return {
      chainId: registry.chainId,
      address: registry.address,
      searchText: buildSearchText({
        symbol: registry.symbol,
        name: registry.name,
        address: registry.address,
      }),
      rankScore: computeRankScore({ registry, market }),
      updatedAt: updatedAtIso,
    }
  })
}
