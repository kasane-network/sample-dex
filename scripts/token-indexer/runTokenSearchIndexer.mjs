// where: scripts/token-indexer entrypoint
// what: Execute one end-to-end token indexer cycle and print machine-readable result
// why: Provide scheduler-friendly command for periodic Supabase updates

import { readIndexerEnv } from './config.mjs'
import { fetchTokenListSources } from './fetchTokenLists.mjs'
import { normalizeTokenRegistry } from './normalize.mjs'
import { collectMarketSnapshotFromRpc } from './rpcMarketCollector.mjs'
import { buildTokenSearchIndex } from './ranking.mjs'
import { SupabaseTokenIndexerRepository } from './supabaseRest.mjs'

export async function runTokenIndexerCycle({
  chainId,
  tokenListUrls,
  rpcCollectorConfig,
  repository,
  now = new Date(),
  fetchImpl = fetch,
  collectMarketSnapshot = collectMarketSnapshotFromRpc,
}) {
  const updatedAtIso = now.toISOString()

  const sources = await fetchTokenListSources({ tokenListUrls, fetchImpl })
  const tokenRegistryRecords = normalizeTokenRegistry({
    chainId,
    sources,
    updatedAtIso,
  })

  await repository.upsertTokenRegistry(tokenRegistryRecords)

  const marketResult = await collectMarketSnapshot(rpcCollectorConfig, updatedAtIso)

  if (marketResult.failedPoolAddresses.length > 0) {
    return {
      tokenRegistryUpserted: tokenRegistryRecords.length,
      tokenMarketSnapshotUpserted: 0,
      tokenSearchIndexUpserted: 0,
      skippedMarketAndSearchUpdate: true,
      failedPoolAddresses: marketResult.failedPoolAddresses,
    }
  }

  const tokenSearchRecords = buildTokenSearchIndex({
    tokenRegistryRecords,
    tokenMarketSnapshots: marketResult.snapshots,
    updatedAtIso,
  })

  await repository.upsertTokenMarketSnapshot(marketResult.snapshots)
  await repository.upsertTokenSearchIndex(tokenSearchRecords)

  return {
    tokenRegistryUpserted: tokenRegistryRecords.length,
    tokenMarketSnapshotUpserted: marketResult.snapshots.length,
    tokenSearchIndexUpserted: tokenSearchRecords.length,
    skippedMarketAndSearchUpdate: false,
    failedPoolAddresses: [],
  }
}

async function main() {
  const env = readIndexerEnv()
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

  console.log(
    JSON.stringify(
      {
        status: result.skippedMarketAndSearchUpdate ? 'partial' : 'ok',
        tokenRegistryUpserted: result.tokenRegistryUpserted,
        tokenMarketSnapshotUpserted: result.tokenMarketSnapshotUpserted,
        tokenSearchIndexUpserted: result.tokenSearchIndexUpserted,
        failedPoolAddresses: result.failedPoolAddresses,
      },
      null,
      2,
    ),
  )

  if (result.failedPoolAddresses.length > 0) {
    process.exitCode = 2
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
