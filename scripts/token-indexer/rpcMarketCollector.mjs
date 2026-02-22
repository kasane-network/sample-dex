// where: scripts/token-indexer RPC market collector
// what: Collect V2 liquidity and 24h swap volume from RPC logs/reserves
// why: Replace GraphQL dependency with direct on-chain snapshot generation

import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  http,
  parseAbi,
  parseAbiItem,
} from 'viem'
import { SECONDS_IN_24H } from './types.mjs'

const v2PairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

const swapEvent = parseAbiItem(
  'event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)',
)

function createClient(config) {
  return createPublicClient({
    transport: http(config.rpcUrl),
  })
}

function toUsdAmount(rawValue, decimals) {
  return Number(formatUnits(rawValue, decimals))
}

function estimatePoolLiquidityUsd({ reserves, spec }) {
  const reserve0Usd = spec.token0IsStableUsd ? toUsdAmount(reserves[0], spec.token0Decimals) : 0
  const reserve1Usd = spec.token1IsStableUsd ? toUsdAmount(reserves[1], spec.token1Decimals) : 0

  if (spec.token0IsStableUsd && spec.token1IsStableUsd) return reserve0Usd + reserve1Usd
  if (spec.token0IsStableUsd) return reserve0Usd * 2
  if (spec.token1IsStableUsd) return reserve1Usd * 2
  return 0
}

function estimateSwapUsd({ spec, amount0In, amount1In, amount0Out, amount1Out }) {
  const token0Volume = amount0In + amount0Out
  const token1Volume = amount1In + amount1Out

  if (spec.token0IsStableUsd) return toUsdAmount(token0Volume, spec.token0Decimals)
  if (spec.token1IsStableUsd) return toUsdAmount(token1Volume, spec.token1Decimals)
  return 0
}

async function collectPoolVolumeUsd24h({ client, pool, fromBlock, toBlock }) {
  const logs = await client.getLogs({
    address: pool.poolAddress,
    fromBlock,
    toBlock,
    event: swapEvent,
  })

  let total = 0
  for (const log of logs) {
    const { amount0In, amount1In, amount0Out, amount1Out } = log.args
    if (
      amount0In === undefined ||
      amount1In === undefined ||
      amount0Out === undefined ||
      amount1Out === undefined
    ) {
      continue
    }

    total += estimateSwapUsd({
      spec: pool,
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
    })
  }

  return total
}

async function readBlockTimestamp({ client, blockNumber, cache }) {
  const cached = cache.get(blockNumber)
  if (cached !== undefined) return cached

  const block = await client.getBlock({ blockNumber })
  const timestamp = block.timestamp
  cache.set(blockNumber, timestamp)
  return timestamp
}

export async function resolveFromBlock24h({ client, latestBlockNumber }) {
  const cache = new Map()
  const latestTimestamp = await readBlockTimestamp({
    client,
    blockNumber: latestBlockNumber,
    cache,
  })

  if (latestTimestamp <= SECONDS_IN_24H) return 0n

  const targetTimestamp = latestTimestamp - SECONDS_IN_24H
  let low = 0n
  let high = latestBlockNumber

  while (low < high) {
    const mid = (low + high) / 2n
    const midTimestamp = await readBlockTimestamp({ client, blockNumber: mid, cache })
    if (midTimestamp < targetTimestamp) low = mid + 1n
    else high = mid
  }

  return low
}

function addSnapshot(map, input) {
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

export async function collectMarketSnapshotFromRpc(config, updatedAtIso) {
  const client = createClient(config)
  const latestBlock = await client.getBlockNumber()
  const fromBlock = await resolveFromBlock24h({ client, latestBlockNumber: latestBlock })

  const snapshotMap = new Map()
  const failedPoolAddresses = []

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
        }),
      ])

      const reserves = [reservesResult[0], reservesResult[1]]
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

export async function fetchTokenMetadata({ rpcUrl, tokenAddress }) {
  const client = createPublicClient({ transport: http(rpcUrl) })

  try {
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'name' }),
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
    ])

    return { symbol, name, decimals }
  } catch {
    return null
  }
}
