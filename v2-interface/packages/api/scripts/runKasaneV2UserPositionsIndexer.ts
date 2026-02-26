import { SupabaseTokenIndexerRepository } from '../src/tokenIndexer/supabaseRest.ts'
import {
  runV2UserPositionsIndexerCycle,
  type V2UserPositionsIndexerInput,
} from '../src/tokenIndexer/v2UserPositionsIndexer.ts'
import { createPublicClient, getAddress, http } from 'viem'

const V2_FACTORY_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '', type: 'uint256' }],
    name: 'allPairs',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const

const V2_PAIR_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const

const ERC20_METADATA_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface IndexerEnv {
  readonly chainId: number
  readonly rpcUrl: string
  readonly walletAddress: string
  readonly supabaseUrl: string
  readonly supabaseServiceRoleKey: string
  readonly factoryAddress: string
  readonly maxPairsToScan: number
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
    factoryAddress: process.env.INDEXER_V2_FACTORY_ADDRESS?.trim() || '0x697c9e9ea0686515fea69f526f85b48d8569ec86',
    maxPairsToScan: parseIntegerEnv('INDEXER_V2_MAX_PAIRS', 200),
  }
}

async function discoverKasaneV2Pools(params: {
  readonly chainId: number
  readonly rpcUrl: string
  readonly factoryAddress: string
  readonly maxPairsToScan: number
}): Promise<V2UserPositionsIndexerInput['pools']> {
  const client = createPublicClient({
    transport: http(params.rpcUrl),
  })

  const factoryAddress = getAddress(params.factoryAddress)
  const allPairsLength = await client.readContract({
    address: factoryAddress,
    abi: V2_FACTORY_ABI,
    functionName: 'allPairsLength',
  })

  const pairsToScan = Math.min(Number(allPairsLength), params.maxPairsToScan)
  const pools: V2UserPositionsIndexerInput['pools'] = []

  for (let i = 0; i < pairsToScan; i++) {
    const pairAddress = getAddress(
      await client.readContract({
        address: factoryAddress,
        abi: V2_FACTORY_ABI,
        functionName: 'allPairs',
        args: [BigInt(i)],
      }),
    )

    const token0Address = getAddress(
      await client.readContract({
        address: pairAddress,
        abi: V2_PAIR_ABI,
        functionName: 'token0',
      }),
    )

    const token1Address = getAddress(
      await client.readContract({
        address: pairAddress,
        abi: V2_PAIR_ABI,
        functionName: 'token1',
      }),
    )

    const token0Symbol = await client.readContract({
      address: token0Address,
      abi: ERC20_METADATA_ABI,
      functionName: 'symbol',
    })

    const token1Symbol = await client.readContract({
      address: token1Address,
      abi: ERC20_METADATA_ABI,
      functionName: 'symbol',
    })

    const token0Decimals = await client.readContract({
      address: token0Address,
      abi: ERC20_METADATA_ABI,
      functionName: 'decimals',
    })

    const token1Decimals = await client.readContract({
      address: token1Address,
      abi: ERC20_METADATA_ABI,
      functionName: 'decimals',
    })

    pools.push({
      chainId: params.chainId,
      pairAddress,
      token0Address,
      token1Address,
      token0Symbol,
      token1Symbol,
      token0Decimals: Number(token0Decimals),
      token1Decimals: Number(token1Decimals),
    })
  }

  return pools
}

async function main(): Promise<void> {
  const env = readEnv()
  const walletAddress = getAddress(env.walletAddress)

  const pools = await discoverKasaneV2Pools({
    chainId: env.chainId,
    rpcUrl: env.rpcUrl,
    factoryAddress: env.factoryAddress,
    maxPairsToScan: env.maxPairsToScan,
  })

  const repository = new SupabaseTokenIndexerRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  })

  const result = await runV2UserPositionsIndexerCycle({
    chainId: env.chainId,
    rpcUrl: env.rpcUrl,
    walletAddress,
    pools,
    repository,
  })

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        chainId: env.chainId,
        walletAddress: walletAddress.toLowerCase(),
        poolsDiscovered: pools.length,
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
