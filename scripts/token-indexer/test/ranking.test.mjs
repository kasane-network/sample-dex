import test from 'node:test'
import assert from 'node:assert/strict'
import { computeRankScore } from '../ranking.mjs'

const baseRegistry = {
  chainId: 1,
  address: '0xabc',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logoUri: null,
  verified: false,
  isSpam: false,
  priority: 0,
  sourcePrimary: 'list',
  updatedAt: '2026-02-22T00:00:00.000Z',
}

const market = {
  chainId: 1,
  address: '0xabc',
  liquidityUsd: 1_000_000,
  volume24hUsd: 100_000,
  updatedAt: '2026-02-22T00:00:00.000Z',
}

test('computeRankScore increases with verified and priority', () => {
  const plain = computeRankScore({ registry: baseRegistry, market })
  const boosted = computeRankScore({
    registry: { ...baseRegistry, verified: true, priority: 5 },
    market,
  })

  assert.ok(boosted > plain)
})

test('computeRankScore applies spam penalty', () => {
  const normal = computeRankScore({ registry: baseRegistry, market })
  const spam = computeRankScore({ registry: { ...baseRegistry, isSpam: true }, market })

  assert.ok(spam < normal)
})
