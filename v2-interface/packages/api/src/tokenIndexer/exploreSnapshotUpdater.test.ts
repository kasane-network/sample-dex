import { runExploreSnapshotUpdaterCycle } from '@universe/api/src/tokenIndexer/exploreSnapshotUpdater'
import {
  ExploreSnapshotRepository,
  PoolMarketSnapshotRecord,
  TokenMarketEnrichmentRecord,
} from '@universe/api/src/tokenIndexer/types'
import { describe, expect, it, vi } from 'vitest'

class InMemoryExploreRepo implements ExploreSnapshotRepository {
  tokenRecords: readonly TokenMarketEnrichmentRecord[] = []
  poolRecords: readonly PoolMarketSnapshotRecord[] = []

  async upsertTokenMarketEnrichment(records: readonly TokenMarketEnrichmentRecord[]): Promise<void> {
    this.tokenRecords = records
  }

  async upsertPoolMarketSnapshot(records: readonly PoolMarketSnapshotRecord[]): Promise<void> {
    this.poolRecords = records
  }
}

describe('runExploreSnapshotUpdaterCycle', () => {
  it('collects pages and upserts token/pool snapshots', async () => {
    const repo = new InMemoryExploreRepo()
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        stats: {
          tokenStats: [
            {
              address: '0xAAA',
              price: { value: 1.23 },
              fullyDilutedValuation: { value: 1000 },
              pricePercentChange1Hour: { value: 0.1 },
              pricePercentChange1Day: { value: 1.2 },
              volume1Hour: { value: 10 },
              volume1Day: { value: 100 },
              volume1Week: { value: 500 },
              volume1Month: { value: 900 },
              volume1Year: { value: 1200 },
              priceHistoryDay: { values: [1, 1.1, 1.2] },
            },
          ],
          topTokens: {
            hourly: [],
            daily: [],
            weekly: [],
            monthly: [],
            yearly: [],
          },
          poolStats: [
            {
              id: '0xPoolA',
              protocolVersion: 'V3',
              feeTier: 500,
              totalLiquidity: { value: 250000 },
              volume1Day: { value: 50000 },
              volume30Day: { value: 600000 },
              boostedApr: 4.5,
              token0: { address: '0xAAA', symbol: 'AAA', name: 'Token AAA', decimals: 18, logo: 'https://a' },
              token1: { address: '0xBBB', symbol: 'BBB', name: 'Token BBB', decimals: 6, logo: 'https://b' },
            },
          ],
          poolStatsV2: [],
          poolStatsV3: [],
          poolStatsV4: [],
        },
        nextPageToken: 'next-1',
      })
      .mockResolvedValueOnce({
        stats: {
          tokenStats: [],
          topTokens: {
            hourly: [{ address: '0xCCC', price: { value: 2 } }],
            daily: [],
            weekly: [],
            monthly: [],
            yearly: [],
          },
          poolStats: [],
          poolStatsV2: [],
          poolStatsV3: [],
          poolStatsV4: [],
        },
      })

    const result = await runExploreSnapshotUpdaterCycle({
      chainId: 1,
      chain: 'ETHEREUM',
      pageSize: 100,
      maxPages: 10,
      repository: repo,
      fetchPage,
      now: new Date('2026-02-23T10:00:00.000Z'),
    })

    expect(result.pagesFetched).toBe(2)
    expect(result.tokenMarketEnrichmentUpserted).toBe(2)
    expect(result.poolMarketSnapshotUpserted).toBe(1)
    expect(repo.tokenRecords.find((record) => record.address === '0xaaa')?.sparkline1d).toEqual([1, 1.1, 1.2])
    expect(repo.poolRecords[0]).toMatchObject({
      address: '0xpoola',
      protocolVersion: 'v3',
      token0Address: '0xaaa',
      token1Address: '0xbbb',
    })
  })

  it('stops when nextPageToken repeats', async () => {
    const repo = new InMemoryExploreRepo()
    const fetchPage = vi.fn().mockResolvedValue({
      stats: {
        tokenStats: [{ address: '0xAAA' }],
        topTokens: { hourly: [], daily: [], weekly: [], monthly: [], yearly: [] },
        poolStats: [],
        poolStatsV2: [],
        poolStatsV3: [],
        poolStatsV4: [],
      },
      nextPageToken: 'same-token',
    })

    const result = await runExploreSnapshotUpdaterCycle({
      chainId: 1,
      chain: 'ETHEREUM',
      pageSize: 50,
      maxPages: 3,
      repository: repo,
      fetchPage,
    })

    expect(result.pagesFetched).toBe(2)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})
