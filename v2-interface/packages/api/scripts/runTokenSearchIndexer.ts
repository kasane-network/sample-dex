// where: @universe/api token indexer runner
// what: Kasane-only indexer entrypoint (token registry/search + pool snapshot + optional user LP positions)
// why: remove Uniswap Explore API dependency and keep automated indexing stable on chainId 4801360

import { runTokenIndexerCycle } from '../src/tokenIndexer/pipeline.ts'
import { SupabaseTokenIndexerRepository } from '../src/tokenIndexer/supabaseRest.ts'
import { runV2UserPositionsIndexerCycle } from '../src/tokenIndexer/v2UserPositionsIndexer.ts'
import { fetchBinanceNativeMarketStats } from '../src/tokenIndexer/binancePrice.ts'
import { deriveTokenPricesFromPools, estimatePoolTvlUsd } from '../src/tokenIndexer/poolMarketPricing.ts'
import { createPublicClient, getAddress, http } from 'viem'

const KASANE_CHAIN_ID = 4801360
const DEFAULT_FACTORY_ADDRESS = '0x697c9e9ea0686515fea69f526f85b48d8569ec86'
const DEFAULT_STABLE_TOKEN_ADDRESS = '0x6052dFc3D327bbe13D182e31a207e4c82cf34a5e'
const DEFAULT_MAX_PAIRS = 200
const DEFAULT_NATIVE_PRICE_SYMBOL = 'ICPUSDT'
const DEFAULT_NATIVE_PRICE_TOKEN_ADDRESSES = [
  '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
] as const
const DEFAULT_MAX_POOL_VOLUME_24H_USD = 10_000_000

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
  {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: '_reserve0', type: 'uint112' },
      { name: '_reserve1', type: 'uint112' },
      { name: '_blockTimestampLast', type: 'uint32' },
    ],
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
    name: 'name',
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

const ERC20_TOTAL_SUPPLY_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface IndexerEnv {
  readonly chainId: number
  readonly rpcUrl: string
  readonly supabaseUrl: string
  readonly supabaseServiceRoleKey: string
  readonly factoryAddress: string
  readonly maxPairsToScan: number
  readonly stableTokenAddresses: readonly string[]
  readonly tokenListUrls: readonly string[]
  readonly walletAddresses: readonly string[]
  readonly nativePriceSymbol: string
  readonly nativePriceTokenAddresses: readonly string[]
  readonly maxPoolVolume24hUsd: number
}

interface DiscoveredPool {
  readonly chainId: number
  readonly pairAddress: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Name: string
  readonly token1Name: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly reserve0Raw: bigint
  readonly reserve1Raw: bigint
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

function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function toDecimal(raw: bigint, decimals: number): number {
  const normalized = Number(raw)
  if (!Number.isFinite(normalized)) {
    return 0
  }
  return normalized / 10 ** decimals
}

async function fetchTokenTotalSupplies(params: {
  readonly rpcUrl: string
  readonly tokenAddresses: readonly string[]
}): Promise<Map<string, bigint>> {
  const client = createPublicClient({ transport: http(params.rpcUrl) })
  const result = new Map<string, bigint>()
  for (const tokenAddress of params.tokenAddresses) {
    try {
      const totalSupply = await client.readContract({
        address: getAddress(tokenAddress),
        abi: ERC20_TOTAL_SUPPLY_ABI,
        functionName: 'totalSupply',
      })
      result.set(tokenAddress.toLowerCase(), totalSupply)
    } catch {
      result.set(tokenAddress.toLowerCase(), BigInt(0))
    }
  }
  return result
}

function readEnv(): IndexerEnv {
  const chainId = parseIntegerEnv('INDEXER_CHAIN_ID', KASANE_CHAIN_ID)
  if (chainId !== KASANE_CHAIN_ID) {
    throw new Error(`This runner is Kasane-only. Expected INDEXER_CHAIN_ID=${KASANE_CHAIN_ID}, received ${chainId}`)
  }

  const stableTokenAddresses = parseCsvEnv(process.env.INDEXER_STABLE_TOKEN_ADDRESSES).map((address) =>
    getAddress(address).toLowerCase(),
  )

  return {
    chainId,
    rpcUrl: requiredEnv('INDEXER_RPC_URL'),
    supabaseUrl: requiredEnv('SUPABASE_URL').replace(/\/$/, ''),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    factoryAddress: process.env.INDEXER_V2_FACTORY_ADDRESS?.trim() || DEFAULT_FACTORY_ADDRESS,
    maxPairsToScan: parseIntegerEnv('INDEXER_V2_MAX_PAIRS', DEFAULT_MAX_PAIRS),
    stableTokenAddresses:
      stableTokenAddresses.length > 0 ? stableTokenAddresses : [getAddress(DEFAULT_STABLE_TOKEN_ADDRESS).toLowerCase()],
    tokenListUrls: parseCsvEnv(process.env.INDEXER_TOKEN_LIST_URLS),
    walletAddresses: parseCsvEnv(process.env.INDEXER_V2_USER_WALLET_ADDRESSES),
    nativePriceSymbol: process.env.INDEXER_NATIVE_PRICE_SYMBOL?.trim() || DEFAULT_NATIVE_PRICE_SYMBOL,
    nativePriceTokenAddresses:
      parseCsvEnv(process.env.INDEXER_NATIVE_PRICE_TOKEN_ADDRESSES).map((address) => getAddress(address).toLowerCase()),
    maxPoolVolume24hUsd: parseIntegerEnv('INDEXER_MAX_POOL_VOLUME_24H_USD', DEFAULT_MAX_POOL_VOLUME_24H_USD),
  }
}

async function discoverKasaneV2Pools(env: IndexerEnv): Promise<readonly DiscoveredPool[]> {
  const client = createPublicClient({ transport: http(env.rpcUrl) })
  const factoryAddress = getAddress(env.factoryAddress)

  const allPairsLength = await client.readContract({
    address: factoryAddress,
    abi: V2_FACTORY_ABI,
    functionName: 'allPairsLength',
  })

  const pairsToScan = Math.min(Number(allPairsLength), env.maxPairsToScan)
  const pools: DiscoveredPool[] = []

  for (let i = 0; i < pairsToScan; i++) {
    const pairAddress = getAddress(
      await client.readContract({
        address: factoryAddress,
        abi: V2_FACTORY_ABI,
        functionName: 'allPairs',
        args: [BigInt(i)],
      }),
    )

    const token0Address = getAddress(await client.readContract({ address: pairAddress, abi: V2_PAIR_ABI, functionName: 'token0' }))
    const token1Address = getAddress(await client.readContract({ address: pairAddress, abi: V2_PAIR_ABI, functionName: 'token1' }))
    const token0Symbol = await client.readContract({ address: token0Address, abi: ERC20_METADATA_ABI, functionName: 'symbol' })
    const token1Symbol = await client.readContract({ address: token1Address, abi: ERC20_METADATA_ABI, functionName: 'symbol' })
    const token0Name = await client.readContract({ address: token0Address, abi: ERC20_METADATA_ABI, functionName: 'name' })
    const token1Name = await client.readContract({ address: token1Address, abi: ERC20_METADATA_ABI, functionName: 'name' })
    const token0Decimals = Number(await client.readContract({ address: token0Address, abi: ERC20_METADATA_ABI, functionName: 'decimals' }))
    const token1Decimals = Number(await client.readContract({ address: token1Address, abi: ERC20_METADATA_ABI, functionName: 'decimals' }))
    const reserves = await client.readContract({ address: pairAddress, abi: V2_PAIR_ABI, functionName: 'getReserves' })

    pools.push({
      chainId: env.chainId,
      pairAddress,
      token0Address,
      token1Address,
      token0Symbol,
      token1Symbol,
      token0Name,
      token1Name,
      token0Decimals,
      token1Decimals,
      reserve0Raw: reserves[0],
      reserve1Raw: reserves[1],
    })
  }

  return pools
}

function createInlineTokenListUrl(chainId: number, pools: readonly DiscoveredPool[]): string {
  const tokenMap = new Map<string, { chainId: number; address: string; symbol: string; name: string; decimals: number }>()
  for (const pool of pools) {
    tokenMap.set(pool.token0Address.toLowerCase(), {
      chainId,
      address: pool.token0Address,
      symbol: pool.token0Symbol,
      name: pool.token0Name,
      decimals: pool.token0Decimals,
    })
    tokenMap.set(pool.token1Address.toLowerCase(), {
      chainId,
      address: pool.token1Address,
      symbol: pool.token1Symbol,
      name: pool.token1Name,
      decimals: pool.token1Decimals,
    })
  }

  const payload = {
    name: 'kasane-rpc-discovered',
    tokens: [...tokenMap.values()],
  }
  return `data:application/json,${encodeURIComponent(JSON.stringify(payload))}`
}

async function main(): Promise<void> {
  const env = readEnv()
  const repository = new SupabaseTokenIndexerRepository({
    supabaseUrl: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  })

  const pools = await discoverKasaneV2Pools(env)
  const stableSet = new Set(env.stableTokenAddresses)
  const tokenListUrls = env.tokenListUrls.length > 0 ? env.tokenListUrls : [createInlineTokenListUrl(env.chainId, pools)]
  const nativePriceTokenAddresses =
    env.nativePriceTokenAddresses.length > 0
      ? env.nativePriceTokenAddresses
      : [...DEFAULT_NATIVE_PRICE_TOKEN_ADDRESSES.map((address) => getAddress(address).toLowerCase())]
  const tokenDecimalsByAddress = new Map<string, number>()
  const nativeMarket = await fetchBinanceNativeMarketStats({ symbol: env.nativePriceSymbol })

  const tokenResult = await runTokenIndexerCycle({
    chainId: env.chainId,
    tokenListUrls,
    rpcCollectorConfig: {
      chainId: env.chainId,
      rpcUrl: env.rpcUrl,
      pools: pools.map((pool) => ({
        poolAddress: getAddress(pool.pairAddress),
        token0Address: getAddress(pool.token0Address),
        token1Address: getAddress(pool.token1Address),
        token0Decimals: pool.token0Decimals,
        token1Decimals: pool.token1Decimals,
        token0IsStableUsd: stableSet.has(pool.token0Address.toLowerCase()),
        token1IsStableUsd: stableSet.has(pool.token1Address.toLowerCase()),
      })),
      maxPoolVolume24hUsd: env.maxPoolVolume24hUsd,
    },
    repository,
  })

  const updatedAt = new Date().toISOString()
  const poolSnapshots = pools.map((pool) => {
    const reserve0 = toDecimal(pool.reserve0Raw, pool.token0Decimals)
    const reserve1 = toDecimal(pool.reserve1Raw, pool.token1Decimals)
    tokenDecimalsByAddress.set(pool.token0Address.toLowerCase(), pool.token0Decimals)
    tokenDecimalsByAddress.set(pool.token1Address.toLowerCase(), pool.token1Decimals)

    return {
      chainId: env.chainId,
      address: pool.pairAddress.toLowerCase(),
      token0Address: pool.token0Address.toLowerCase(),
      token1Address: pool.token1Address.toLowerCase(),
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      token0Name: pool.token0Name,
      token1Name: pool.token1Name,
      token0Decimals: pool.token0Decimals,
      token1Decimals: pool.token1Decimals,
      reserve0,
      reserve1,
    }
  })

  const seedTokenPricesUsd = new Map<string, number>()
  if (nativeMarket?.priceUsd) {
    for (const nativeAddress of nativePriceTokenAddresses) {
      seedTokenPricesUsd.set(nativeAddress.toLowerCase(), nativeMarket.priceUsd)
    }
  }
  const tokenPriceByAddress = deriveTokenPricesFromPools({
    stableTokenAddresses: [...stableSet],
    pools: poolSnapshots.map((pool) => ({
      token0Address: pool.token0Address,
      token1Address: pool.token1Address,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1,
    })),
    seedTokenPricesUsd,
  })

  await repository.upsertPoolMarketSnapshot(
    poolSnapshots.map((pool) => {
      const token0PriceUsd = tokenPriceByAddress.get(pool.token0Address)
      const token1PriceUsd = tokenPriceByAddress.get(pool.token1Address)
      const tvlUsd = estimatePoolTvlUsd({
        reserve0: pool.reserve0,
        reserve1: pool.reserve1,
        token0PriceUsd,
        token1PriceUsd,
      })

      return {
        chainId: env.chainId,
        address: pool.address,
        protocolVersion: 'v2',
        feeTierBps: 30,
        token0Address: pool.token0Address,
        token1Address: pool.token1Address,
        token0Symbol: pool.token0Symbol,
        token1Symbol: pool.token1Symbol,
        token0Name: pool.token0Name,
        token1Name: pool.token1Name,
        token0Decimals: pool.token0Decimals,
        token1Decimals: pool.token1Decimals,
        token0LogoUri: null,
        token1LogoUri: null,
        tvlUsd,
        volume24hUsd: 0,
        volume30dUsd: 0,
        boostedApr: null,
        updatedAt,
      }
    }),
  )

  const uniqueTokenAddresses = [...tokenDecimalsByAddress.keys()]
  const tokenSupplyByAddress = await fetchTokenTotalSupplies({
    rpcUrl: env.rpcUrl,
    tokenAddresses: uniqueTokenAddresses,
  })

  if (uniqueTokenAddresses.length > 0) {
    await repository.upsertTokenMarketEnrichment(
      uniqueTokenAddresses.map((address) => {
        const decimals = tokenDecimalsByAddress.get(address) ?? 18
        const totalSupply = tokenSupplyByAddress.get(address) ?? BigInt(0)
        const priceUsd = tokenPriceByAddress.get(address)

        return {
          chainId: env.chainId,
          address,
          priceUsd,
          fdvUsd: priceUsd !== undefined ? toDecimal(totalSupply, decimals) * priceUsd : undefined,
          updatedAt,
        }
      }),
    )
  }

  const wrappedNativeAddress = nativePriceTokenAddresses[0]
  const fallbackNativePrice = wrappedNativeAddress ? tokenPriceByAddress.get(wrappedNativeAddress.toLowerCase()) : undefined
  const nativePriceUsd = nativeMarket?.priceUsd ?? fallbackNativePrice
  const nativePriceChange1dPct = nativeMarket?.priceChange1dPct

  if (nativePriceUsd !== undefined) {
    await repository.upsertTokenMarketEnrichment(
      nativePriceTokenAddresses.map((address) => ({
        chainId: env.chainId,
        address,
        priceUsd: nativePriceUsd,
        priceChange1dPct: nativePriceChange1dPct,
        updatedAt,
      })),
    )
  }

  let userV2PositionsUpserted = 0
  if (env.walletAddresses.length > 0) {
    for (const walletAddress of env.walletAddresses) {
      const result = await runV2UserPositionsIndexerCycle({
        chainId: env.chainId,
        rpcUrl: env.rpcUrl,
        walletAddress: getAddress(walletAddress),
        pools: pools.map((pool) => ({
          chainId: env.chainId,
          pairAddress: pool.pairAddress,
          token0Address: pool.token0Address,
          token1Address: pool.token1Address,
          token0Symbol: pool.token0Symbol,
          token1Symbol: pool.token1Symbol,
          token0Decimals: pool.token0Decimals,
          token1Decimals: pool.token1Decimals,
        })),
        repository,
      })
      userV2PositionsUpserted += result.userPositionsUpserted
    }
  }

  console.log(
    JSON.stringify(
      {
        status: tokenResult.failedPoolAddresses.length > 0 ? 'partial' : 'ok',
        chainId: env.chainId,
        poolsDiscovered: pools.length,
        tokenRegistryUpserted: tokenResult.tokenRegistryUpserted,
        tokenMarketSnapshotUpserted: tokenResult.tokenMarketSnapshotUpserted,
        tokenSearchIndexUpserted: tokenResult.tokenSearchIndexUpserted,
        poolMarketSnapshotUpserted: pools.length,
        failedPoolAddresses: tokenResult.failedPoolAddresses,
        walletsProcessed: env.walletAddresses.length,
        userV2PositionsUpserted,
      },
      null,
      2,
    ),
  )

  if (tokenResult.failedPoolAddresses.length > 0) {
    process.exitCode = 2
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
