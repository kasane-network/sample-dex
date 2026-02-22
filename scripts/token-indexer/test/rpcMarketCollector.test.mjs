import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveFromBlock24h } from '../rpcMarketCollector.mjs'

test('resolveFromBlock24h returns first block at or after 24h threshold', async () => {
  const latestBlockNumber = 9n
  const timestamps = new Map([
    [0n, 100_000n],
    [1n, 103_000n],
    [2n, 106_000n],
    [3n, 109_000n],
    [4n, 113_500n],
    [5n, 113_600n],
    [6n, 130_000n],
    [7n, 150_000n],
    [8n, 180_000n],
    [9n, 200_000n],
  ])

  const client = {
    getBlock: async ({ blockNumber }) => ({ timestamp: timestamps.get(blockNumber) }),
  }

  const fromBlock = await resolveFromBlock24h({ client, latestBlockNumber })
  assert.equal(fromBlock, 5n)
})

test('resolveFromBlock24h falls back to genesis for very early chains', async () => {
  const client = {
    getBlock: async () => ({ timestamp: 1_000n }),
  }

  const fromBlock = await resolveFromBlock24h({ client, latestBlockNumber: 50n })
  assert.equal(fromBlock, 0n)
})
