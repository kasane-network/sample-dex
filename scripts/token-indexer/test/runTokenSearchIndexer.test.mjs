import test from 'node:test'
import assert from 'node:assert/strict'
import { runTokenIndexerCycle } from '../runTokenSearchIndexer.mjs'

class InMemoryRepo {
  constructor() {
    this.registry = 0
    this.market = 0
    this.search = 0
  }

  async upsertTokenRegistry(records) {
    this.registry += records.length
  }

  async upsertTokenMarketSnapshot(records) {
    this.market += records.length
  }

  async upsertTokenSearchIndex(records) {
    this.search += records.length
  }
}

function tokenListFetch() {
  return async () =>
    new Response(
      JSON.stringify({
        tokens: [
          {
            chainId: 1,
            address: '0x00000000000000000000000000000000000000aa',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          },
        ],
      }),
      { status: 200 },
    )
}

test('runTokenIndexerCycle returns partial and skips market/search writes on failed pools', async () => {
  const repo = new InMemoryRepo()
  const result = await runTokenIndexerCycle({
    chainId: 1,
    tokenListUrls: ['https://example.com/list.json'],
    rpcCollectorConfig: { chainId: 1, rpcUrl: 'https://rpc.example', pools: [] },
    repository: repo,
    fetchImpl: tokenListFetch(),
    collectMarketSnapshot: async () => ({ snapshots: [], failedPoolAddresses: ['0xpool'] }),
  })

  assert.equal(result.skippedMarketAndSearchUpdate, true)
  assert.equal(repo.registry, 1)
  assert.equal(repo.market, 0)
  assert.equal(repo.search, 0)
})
