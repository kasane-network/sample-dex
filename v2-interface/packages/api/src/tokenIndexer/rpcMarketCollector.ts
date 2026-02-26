import {
  MarketCollectionResult,
  RpcMarketCollectorConfig,
  TokenMarketSnapshotRecord,
  V2PoolSpec,
} from '@universe/api/src/tokenIndexer/types'
import type { Address } from 'viem'
import { createPublicClient, erc20Abi, formatUnits, http, PublicClient, parseAbi, parseAbiItem, toHex } from 'viem'

const v2PairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)',
])

const swapEvent = parseAbiItem(
  'event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)',
)
const ZERO_BIGINT = BigInt(0)
const ONE_BIGINT = BigInt(1)
const TWO_BIGINT = BigInt(2)
const SECONDS_IN_24H = BigInt(24) * BigInt(60) * BigInt(60)

function createClient(config: RpcMarketCollectorConfig): PublicClient {
  return createPublicClient({
    transport: http(config.rpcUrl),
  })
}

function toUsdAmount(rawValue: bigint, decimals: number): number {
  return Number(formatUnits(rawValue, decimals))
}

function estimatePoolLiquidityUsd(params: {
  readonly reserves: readonly [bigint, bigint]
  readonly spec: V2PoolSpec
}): number {
  const reserve0Usd = params.spec.token0IsStableUsd ? toUsdAmount(params.reserves[0], params.spec.token0Decimals) : 0
  const reserve1Usd = params.spec.token1IsStableUsd ? toUsdAmount(params.reserves[1], params.spec.token1Decimals) : 0

  if (params.spec.token0IsStableUsd && params.spec.token1IsStableUsd) {
    return reserve0Usd + reserve1Usd
  }
  if (params.spec.token0IsStableUsd) {
    return reserve0Usd * 2
  }
  if (params.spec.token1IsStableUsd) {
    return reserve1Usd * 2
  }
  return 0
}

function estimateSwapUsd(params: {
  readonly spec: V2PoolSpec
  readonly amount0In: bigint
  readonly amount1In: bigint
  readonly amount0Out: bigint
  readonly amount1Out: bigint
}): number {
  const token0Volume = params.amount0In + params.amount0Out
  const token1Volume = params.amount1In + params.amount1Out
  const token0Usd = toUsdAmount(token0Volume, params.spec.token0Decimals)
  const token1Usd = toUsdAmount(token1Volume, params.spec.token1Decimals)

  if (params.spec.token0IsStableUsd && params.spec.token1IsStableUsd) {
    // When both sides are marked stable, pick conservative side to avoid spikes from bad metadata.
    return Math.min(token0Usd, token1Usd)
  }

  if (params.spec.token0IsStableUsd) {
    return token0Usd
  }
  if (params.spec.token1IsStableUsd) {
    return token1Usd
  }

  return 0
}

async function collectPoolVolumeUsd24h(params: {
  readonly client: PublicClient
  readonly pool: V2PoolSpec
  readonly fromBlock: bigint
  readonly toBlock: bigint
  readonly maxPoolVolume24hUsd?: number
}): Promise<number> {
  const logs = await params.client.getLogs({
    address: params.pool.poolAddress,
    fromBlock: params.fromBlock,
    toBlock: params.toBlock,
    event: swapEvent,
  })

  let total = 0

  for (const log of logs) {
    const amount0In = log.args.amount0In
    const amount1In = log.args.amount1In
    const amount0Out = log.args.amount0Out
    const amount1Out = log.args.amount1Out

    if (amount0In === undefined || amount1In === undefined || amount0Out === undefined || amount1Out === undefined) {
      continue
    }

    total += estimateSwapUsd({
      spec: params.pool,
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
    })
  }

  if (params.maxPoolVolume24hUsd !== undefined && Number.isFinite(params.maxPoolVolume24hUsd)) {
    return Math.min(total, params.maxPoolVolume24hUsd)
  }

  return total
}

async function readBlockTimestamp(params: {
  readonly client: PublicClient
  readonly blockNumber: bigint
  readonly cache: Map<bigint, bigint>
}): Promise<bigint> {
  const cached = params.cache.get(params.blockNumber)
  if (cached !== undefined) {
    return cached
  }

  const block = await params.client.getBlock({
    blockNumber: params.blockNumber,
  })
  const timestamp = block.timestamp
  params.cache.set(params.blockNumber, timestamp)
  return timestamp
}

// Resolve the first block whose timestamp is >= latestTimestamp - 24h.
async function resolveFromBlock24h(params: {
  readonly client: PublicClient
  readonly latestBlockNumber: bigint
}): Promise<bigint> {
  const timestampCache = new Map<bigint, bigint>()
  const latestTimestamp = await readBlockTimestamp({
    client: params.client,
    blockNumber: params.latestBlockNumber,
    cache: timestampCache,
  })

  if (latestTimestamp <= SECONDS_IN_24H) {
    return ZERO_BIGINT
  }

  const targetTimestamp = latestTimestamp - SECONDS_IN_24H
  let low = ZERO_BIGINT
  let high = params.latestBlockNumber

  while (low < high) {
    const mid = (low + high) / TWO_BIGINT
    const midTimestamp = await readBlockTimestamp({
      client: params.client,
      blockNumber: mid,
      cache: timestampCache,
    })

    if (midTimestamp < targetTimestamp) {
      low = mid + ONE_BIGINT
    } else {
      high = mid
    }
  }

  return low
}

function addSnapshot(
  map: Map<string, TokenMarketSnapshotRecord>,
  input: { chainId: number; address: Address; liquidityUsd: number; volume24hUsd: number; updatedAt: string },
): void {
  const key = `${input.chainId}:${input.address.toLowerCase()}`
  const current = map.get(key)

  if (!current) {
    map.set(key, {
      chainId: input.chainId,
      address: input.address.toLowerCase(),
      liquidityUsd: input.liquidityUsd,
      volume24hUsd: input.volume24hUsd,
      updatedAt: input.updatedAt,
    })
    return
  }

  map.set(key, {
    ...current,
    liquidityUsd: current.liquidityUsd + input.liquidityUsd,
    volume24hUsd: current.volume24hUsd + input.volume24hUsd,
  })
}

export async function collectMarketSnapshotFromRpc(
  config: RpcMarketCollectorConfig,
  updatedAtIso: string,
): Promise<MarketCollectionResult> {
  const client = createClient(config)
  const latestBlock = await client.getBlockNumber()
  const fromBlock = await resolveFromBlock24h({
    client,
    latestBlockNumber: latestBlock,
  })

  const snapshotMap = new Map<string, TokenMarketSnapshotRecord>()
  const failedPoolAddresses: string[] = []

  for (const pool of config.pools) {
    try {
      const [reservesResult, volume24hUsd] = await Promise.all([
        client.readContract({
          address: pool.poolAddress,
          abi: v2PairAbi,
          functionName: 'getReserves',
        }),
        collectPoolVolumeUsd24h({
          client,
          pool,
          fromBlock,
          toBlock: latestBlock,
          maxPoolVolume24hUsd: config.maxPoolVolume24hUsd,
        }),
      ])

      const reserves: readonly [bigint, bigint] = [reservesResult[0], reservesResult[1]]
      const liquidityUsd = estimatePoolLiquidityUsd({ reserves, spec: pool })

      addSnapshot(snapshotMap, {
        chainId: config.chainId,
        address: pool.token0Address,
        liquidityUsd,
        volume24hUsd,
        updatedAt: updatedAtIso,
      })

      addSnapshot(snapshotMap, {
        chainId: config.chainId,
        address: pool.token1Address,
        liquidityUsd,
        volume24hUsd,
        updatedAt: updatedAtIso,
      })
    } catch {
      failedPoolAddresses.push(pool.poolAddress)
    }
  }

  return {
    snapshots: [...snapshotMap.values()],
    failedPoolAddresses,
  }
}

export async function fetchTokenMetadata(params: {
  readonly rpcUrl: string
  readonly chainId: number
  readonly tokenAddress: Address
}): Promise<{ symbol: string; name: string; decimals: number } | null> {
  const client = createPublicClient({
    transport: http(params.rpcUrl),
  })

  try {
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({ address: params.tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: params.tokenAddress, abi: erc20Abi, functionName: 'name' }),
      client.readContract({ address: params.tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
    ])

    return { symbol, name, decimals }
  } catch {
    return null
  }
}

export function encodeBlockTag(blockNumber: bigint): `0x${string}` {
  return toHex(blockNumber)
}
