import { buildSearchText } from '@universe/api/src/tokenIndexer/normalize'
import {
  RankWeights,
  TokenMarketSnapshotRecord,
  TokenRegistryRecord,
  TokenSearchIndexRecord,
} from '@universe/api/src/tokenIndexer/types'

export const DEFAULT_RANK_WEIGHTS: RankWeights = {
  verifiedBonus: 40,
  liquidityWeight: 10,
  volumeWeight: 6,
  spamPenalty: 100,
}

function log10(value: number): number {
  return Math.log(value) / Math.log(10)
}

function createMarketLookup(
  marketSnapshots: readonly TokenMarketSnapshotRecord[],
): ReadonlyMap<string, TokenMarketSnapshotRecord> {
  const map = new Map<string, TokenMarketSnapshotRecord>()

  for (const snapshot of marketSnapshots) {
    map.set(`${snapshot.chainId}:${snapshot.address}`, snapshot)
  }

  return map
}

export function computeRankScore(params: {
  readonly registry: TokenRegistryRecord
  readonly market: TokenMarketSnapshotRecord | undefined
  readonly weights?: RankWeights
}): number {
  const weights = params.weights ?? DEFAULT_RANK_WEIGHTS
  const liquidityUsd = Math.max(params.market?.liquidityUsd ?? 0, 0)
  const volume24hUsd = Math.max(params.market?.volume24hUsd ?? 0, 0)

  let rank = params.registry.priority

  if (params.registry.verified) {
    rank += weights.verifiedBonus
  }

  rank += log10(liquidityUsd + 1) * weights.liquidityWeight
  rank += log10(volume24hUsd + 1) * weights.volumeWeight

  if (params.registry.isSpam) {
    rank -= weights.spamPenalty
  }

  return rank
}

export function buildTokenSearchIndex(params: {
  readonly tokenRegistryRecords: readonly TokenRegistryRecord[]
  readonly tokenMarketSnapshots: readonly TokenMarketSnapshotRecord[]
  readonly updatedAtIso: string
  readonly weights?: RankWeights
}): TokenSearchIndexRecord[] {
  const marketLookup = createMarketLookup(params.tokenMarketSnapshots)

  return params.tokenRegistryRecords.map((registry) => {
    const key = `${registry.chainId}:${registry.address}`
    const market = marketLookup.get(key)

    return {
      chainId: registry.chainId,
      address: registry.address,
      searchText: buildSearchText({
        symbol: registry.symbol,
        name: registry.name,
        address: registry.address,
      }),
      rankScore: computeRankScore({ registry, market, weights: params.weights }),
      updatedAt: params.updatedAtIso,
    }
  })
}
