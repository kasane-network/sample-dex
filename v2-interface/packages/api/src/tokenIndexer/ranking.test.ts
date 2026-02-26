import { buildTokenSearchIndex, computeRankScore } from '@universe/api/src/tokenIndexer/ranking'
import { TokenMarketSnapshotRecord, TokenRegistryRecord } from '@universe/api/src/tokenIndexer/types'
import { describe, expect, it } from 'vitest'

const registry: TokenRegistryRecord = {
  chainId: 1,
  address: '0xabc',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logoUri: null,
  verified: true,
  isSpam: false,
  priority: 10,
  sourcePrimary: 'official-list',
  updatedAt: '2026-02-22T09:00:00.000Z',
}

const market: TokenMarketSnapshotRecord = {
  chainId: 1,
  address: '0xabc',
  liquidityUsd: 1_000_000,
  volume24hUsd: 200_000,
  updatedAt: '2026-02-22T09:00:00.000Z',
}

describe('computeRankScore', () => {
  it('increases score with verified/priority/liquidity/volume', () => {
    const score = computeRankScore({ registry, market })
    expect(score).toBeGreaterThan(50)
  })

  it('applies spam penalty', () => {
    const nonSpamScore = computeRankScore({
      registry,
      market,
    })

    const spamScore = computeRankScore({
      registry: {
        ...registry,
        isSpam: true,
      },
      market,
    })

    expect(spamScore).toBeLessThan(nonSpamScore)
  })
})

describe('buildTokenSearchIndex', () => {
  it('creates search records for all registry rows', () => {
    const records = buildTokenSearchIndex({
      tokenRegistryRecords: [registry],
      tokenMarketSnapshots: [market],
      updatedAtIso: '2026-02-22T09:00:00.000Z',
    })

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      chainId: 1,
      address: '0xabc',
      searchText: 'usdc usd coin 0xabc',
    })
    expect(records[0].rankScore).toBeGreaterThan(0)
  })
})
