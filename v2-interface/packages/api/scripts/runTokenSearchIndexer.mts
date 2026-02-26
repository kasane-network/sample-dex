import { readTokenIndexerEnv } from '../src/tokenIndexer/config'
import {
  createExploreStatsPageFetcher,
  DEFAULT_EXPLORE_API_BASE_URL,
  DEFAULT_EXPLORE_MAX_PAGES,
  DEFAULT_EXPLORE_PAGE_SIZE,
  mapChainIdToExploreChain,
  runExploreSnapshotUpdaterCycle,
} from '../src/tokenIndexer/exploreSnapshotUpdater'
import { runTokenIndexerCycle } from '../src/tokenIndexer/pipeline'
import { SupabaseTokenIndexerRepository } from '../src/tokenIndexer/supabaseRest'
import { runV2UserPositionsIndexerCycle } from '../src/tokenIndexer/v2UserPositionsIndexer'
import { createSupabaseExploreReadClient } from '../src/tokenIndexer/supabaseExploreReadClient'
import { getAddress } from 'viem'

function parseWalletAddressList(value: string | undefined): string[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

async function main(): Promise<void> {
  const env = readTokenIndexerEnv()
  const repository = new SupabaseTokenIndexerRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  })

  const result = await runTokenIndexerCycle({
    chainId: env.chainId,
    tokenListUrls: env.tokenListUrls,
    rpcCollectorConfig: env.rpcCollectorConfig,
    repository,
  })

  const exploreChain = mapChainIdToExploreChain(env.chainId)
  if (!exploreChain) {
    throw new Error(`Unsupported INDEXER_CHAIN_ID for Explore snapshot updater: ${env.chainId}`)
  }

  const exploreResult = await runExploreSnapshotUpdaterCycle({
    chainId: env.chainId,
    chain: exploreChain,
    pageSize: DEFAULT_EXPLORE_PAGE_SIZE,
    maxPages: DEFAULT_EXPLORE_MAX_PAGES,
    repository,
    fetchPage: createExploreStatsPageFetcher({
      baseUrl: DEFAULT_EXPLORE_API_BASE_URL,
      apiKey: process.env.INDEXER_EXPLORE_API_KEY?.trim() || undefined,
    }),
  })

  const walletAddresses = parseWalletAddressList(process.env.INDEXER_V2_USER_WALLET_ADDRESSES)
  let userPositionSummary: { walletsProcessed: number; userV2PositionsUpserted: number } | undefined
  if (walletAddresses.length > 0) {
    const readClient = createSupabaseExploreReadClient({
      supabaseUrl: env.supabaseUrl,
      anonKey: env.supabaseServiceRoleKey,
    })
    const pools = await readClient.listTopPools({
      chainId: env.chainId,
      limit: 1000,
      protocolVersion: 'v2',
    })

    let totalUpserted = 0
    for (const walletAddress of walletAddresses) {
      const result = await runV2UserPositionsIndexerCycle({
        chainId: env.chainId,
        rpcUrl: env.rpcCollectorConfig.rpcUrl,
        walletAddress: getAddress(walletAddress),
        pools: pools.map((pool) => ({
          chainId: pool.chainId,
          pairAddress: pool.address,
          token0Address: pool.token0Address,
          token1Address: pool.token1Address,
          token0Symbol: pool.token0Symbol,
          token1Symbol: pool.token1Symbol,
          token0Decimals: pool.token0Decimals,
          token1Decimals: pool.token1Decimals,
        })),
        repository,
      })
      totalUpserted += result.userPositionsUpserted
    }

    userPositionSummary = {
      walletsProcessed: walletAddresses.length,
      userV2PositionsUpserted: totalUpserted,
    }
  }

  console.log(
    JSON.stringify(
      {
        status: result.skippedMarketAndSearchUpdate ? 'partial' : 'ok',
        tokenRegistryUpserted: result.tokenRegistryUpserted,
        tokenMarketSnapshotUpserted: result.tokenMarketSnapshotUpserted,
        tokenSearchIndexUpserted: result.tokenSearchIndexUpserted,
        failedPoolAddresses: result.failedPoolAddresses,
        explorePagesFetched: exploreResult.pagesFetched,
        tokenMarketEnrichmentUpserted: exploreResult.tokenMarketEnrichmentUpserted,
        poolMarketSnapshotUpserted: exploreResult.poolMarketSnapshotUpserted,
        ...(userPositionSummary ?? {}),
      },
      null,
      2,
    ),
  )

  if (result.failedPoolAddresses.length > 0) {
    process.exitCode = 2
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
