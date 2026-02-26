import {
  createSupabaseExploreReadClient,
  runV2UserPositionsIndexerCycle,
  SupabaseTokenIndexerRepository,
} from '../src'
import { getAddress } from 'viem'

interface IndexerEnv {
  readonly chainId: number
  readonly rpcUrl: string
  readonly walletAddress: string
  readonly supabaseUrl: string
  readonly supabaseServiceRoleKey: string
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

function parseIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer env ${name}: ${raw}`)
  }
  return parsed
}

function readEnv(): IndexerEnv {
  return {
    chainId: parseIntegerEnv('INDEXER_CHAIN_ID', 4801360),
    rpcUrl: requiredEnv('INDEXER_RPC_URL'),
    walletAddress: requiredEnv('INDEXER_WALLET_ADDRESS'),
    supabaseUrl: requiredEnv('SUPABASE_URL').replace(/\/$/, ''),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

async function main(): Promise<void> {
  const env = readEnv()
  const repository = new SupabaseTokenIndexerRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  })
  const readClient = createSupabaseExploreReadClient({
    supabaseUrl: env.supabaseUrl,
    anonKey: env.supabaseServiceRoleKey,
  })

  const pools = await readClient.listTopPools({
    chainId: env.chainId,
    limit: 1000,
    protocolVersion: 'v2',
  })

  const result = await runV2UserPositionsIndexerCycle({
    chainId: env.chainId,
    rpcUrl: env.rpcUrl,
    walletAddress: getAddress(env.walletAddress),
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

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        chainId: env.chainId,
        walletAddress: env.walletAddress.toLowerCase(),
        poolsScanned: result.poolsScanned,
        userPositionsUpserted: result.userPositionsUpserted,
      },
      null,
      2,
    ),
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
