import { runTokenIndexerCycle } from '@universe/api/src/tokenIndexer/pipeline'
import {
  TokenIndexerRepository,
  TokenMarketSnapshotRecord,
  TokenSearchIndexRecord,
} from '@universe/api/src/tokenIndexer/types'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@universe/api/src/tokenIndexer/rpcMarketCollector', () => ({
  collectMarketSnapshotFromRpc: vi.fn(),
}))

import { collectMarketSnapshotFromRpc } from '@universe/api/src/tokenIndexer/rpcMarketCollector'

class InMemoryRepo implements TokenIndexerRepository {
  public registryCalls = 0
  public marketCalls = 0
  public searchCalls = 0

  async upsertTokenRegistry(): Promise<void> {
    this.registryCalls += 1
  }

  async upsertTokenMarketSnapshot(_records: readonly TokenMarketSnapshotRecord[]): Promise<void> {
    this.marketCalls += 1
  }

  async upsertTokenSearchIndex(_records: readonly TokenSearchIndexRecord[]): Promise<void> {
    this.searchCalls += 1
  }
}

function createTokenListFetch(): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(
      JSON.stringify({
        tokens: [
          {
            chainId: 1,
            address: '0xabc',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          },
        ],
      }),
      { status: 200 },
    )
  })
}

describe('runTokenIndexerCycle', () => {
  it('skips market and search upserts when a pool fails', async () => {
    vi.mocked(collectMarketSnapshotFromRpc).mockResolvedValueOnce({
      snapshots: [],
      failedPoolAddresses: ['0xpool'],
    })

    const repo = new InMemoryRepo()

    const result = await runTokenIndexerCycle({
      chainId: 1,
      tokenListUrls: ['https://example.com/list.json'],
      fetchImpl: createTokenListFetch(),
      rpcCollectorConfig: {
        chainId: 1,
        rpcUrl: 'https://example-rpc.invalid',
        pools: [],
      },
      repository: repo,
      now: new Date('2026-02-22T09:00:00.000Z'),
    })

    expect(result.skippedMarketAndSearchUpdate).toBe(true)
    expect(repo.registryCalls).toBe(1)
    expect(repo.marketCalls).toBe(0)
    expect(repo.searchCalls).toBe(0)
  })

  it('upserts market and search when collection succeeds', async () => {
    vi.mocked(collectMarketSnapshotFromRpc).mockResolvedValueOnce({
      snapshots: [
        {
          chainId: 1,
          address: '0xabc',
          liquidityUsd: 100,
          volume24hUsd: 50,
          updatedAt: '2026-02-22T09:00:00.000Z',
        },
      ],
      failedPoolAddresses: [],
    })

    const repo = new InMemoryRepo()

    const result = await runTokenIndexerCycle({
      chainId: 1,
      tokenListUrls: ['https://example.com/list.json'],
      fetchImpl: createTokenListFetch(),
      rpcCollectorConfig: {
        chainId: 1,
        rpcUrl: 'https://example-rpc.invalid',
        pools: [],
      },
      repository: repo,
      now: new Date('2026-02-22T09:00:00.000Z'),
    })

    expect(result.skippedMarketAndSearchUpdate).toBe(false)
    expect(repo.registryCalls).toBe(1)
    expect(repo.marketCalls).toBe(1)
    expect(repo.searchCalls).toBe(1)
  })
})
