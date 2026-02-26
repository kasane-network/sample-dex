import { fetchTokenListSources } from '@universe/api/src/tokenIndexer/fetchTokenLists'
import { normalizeTokenRegistry } from '@universe/api/src/tokenIndexer/normalize'
import { buildTokenSearchIndex } from '@universe/api/src/tokenIndexer/ranking'
import { collectMarketSnapshotFromRpc } from '@universe/api/src/tokenIndexer/rpcMarketCollector'
import {
  RpcMarketCollectorConfig,
  TokenIndexerRepository,
  TokenIndexerRunResult,
  TokenOverrides,
} from '@universe/api/src/tokenIndexer/types'

export interface TokenIndexerPipelineInput {
  readonly chainId: number
  readonly tokenListUrls: readonly string[]
  readonly rpcCollectorConfig: RpcMarketCollectorConfig
  readonly repository: TokenIndexerRepository
  readonly overridesByAddress?: ReadonlyMap<string, TokenOverrides>
  readonly now?: Date
  readonly fetchImpl?: typeof fetch
}

function normalizeOverrides(
  overridesByAddress?: ReadonlyMap<string, TokenOverrides>,
): ReadonlyMap<string, TokenOverrides> | undefined {
  if (!overridesByAddress) {
    return undefined
  }

  const normalized = new Map<string, TokenOverrides>()
  for (const [address, override] of overridesByAddress.entries()) {
    normalized.set(address.toLowerCase(), override)
  }

  return normalized
}

export async function runTokenIndexerCycle(input: TokenIndexerPipelineInput): Promise<TokenIndexerRunResult> {
  const now = input.now ?? new Date()
  const updatedAtIso = now.toISOString()

  const sources = await fetchTokenListSources({
    tokenListUrls: input.tokenListUrls,
    fetchImpl: input.fetchImpl,
  })

  const tokenRegistryRecords = normalizeTokenRegistry({
    chainId: input.chainId,
    sources,
    overridesByAddress: normalizeOverrides(input.overridesByAddress),
    updatedAtIso,
  })

  await input.repository.upsertTokenRegistry(tokenRegistryRecords)

  const marketResult = await collectMarketSnapshotFromRpc(input.rpcCollectorConfig, updatedAtIso)

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

  await input.repository.upsertTokenMarketSnapshot(marketResult.snapshots)
  await input.repository.upsertTokenSearchIndex(tokenSearchRecords)

  return {
    tokenRegistryUpserted: tokenRegistryRecords.length,
    tokenMarketSnapshotUpserted: marketResult.snapshots.length,
    tokenSearchIndexUpserted: tokenSearchRecords.length,
    skippedMarketAndSearchUpdate: false,
    failedPoolAddresses: [],
  }
}
