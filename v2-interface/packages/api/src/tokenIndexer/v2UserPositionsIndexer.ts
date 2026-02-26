// where: @universe/api token indexer
// what: runtime for collecting Kasane V2 wallet LP positions from RPC and persisting into Supabase
// why: keep wallet position retrieval fast on web by precomputing and storing balances

import type { V2UserPositionsRepository } from '@universe/api/src/tokenIndexer/types'
import { buildV2UserLpPositionRecord } from '@universe/api/src/tokenIndexer/v2UserPositions'
import type { Address } from 'viem'
import { createPublicClient, getAddress, http } from 'viem'

const V2_PAIR_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
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

interface V2PoolSnapshotItem {
  readonly chainId: number
  readonly pairAddress: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
}

export interface V2UserPositionsIndexerInput {
  readonly chainId: number
  readonly rpcUrl: string
  readonly walletAddress: Address
  readonly pools: readonly V2PoolSnapshotItem[]
  readonly repository: V2UserPositionsRepository
}

export interface V2UserPositionsIndexerResult {
  readonly poolsScanned: number
  readonly userPositionsUpserted: number
}

export async function runV2UserPositionsIndexerCycle(
  input: V2UserPositionsIndexerInput,
): Promise<V2UserPositionsIndexerResult> {
  const client = createPublicClient({
    transport: http(input.rpcUrl),
  })

  const updatedAtIso = new Date().toISOString()
  const records = []

  for (const pool of input.pools) {
    const pairAddress = getAddress(pool.pairAddress)
    const lpBalanceRaw = await client.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: 'balanceOf',
      args: [input.walletAddress],
    })

    if (lpBalanceRaw <= BigInt(0)) {
      continue
    }

    const lpTotalSupplyRaw = await client.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: 'totalSupply',
    })
    const reserves = await client.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: 'getReserves',
    })

    records.push(
      buildV2UserLpPositionRecord({
        chainId: input.chainId,
        walletAddress: input.walletAddress,
        pairAddress,
        lpBalanceRaw,
        lpTotalSupplyRaw,
        reserve0Raw: reserves[0],
        reserve1Raw: reserves[1],
        token0Address: getAddress(pool.token0Address),
        token1Address: getAddress(pool.token1Address),
        token0Symbol: pool.token0Symbol,
        token1Symbol: pool.token1Symbol,
        token0Decimals: pool.token0Decimals,
        token1Decimals: pool.token1Decimals,
        updatedAtIso,
      }),
    )
  }

  await input.repository.upsertV2UserLpPositions(records)
  await input.repository.deleteMissingV2UserLpPositions({
    chainId: input.chainId,
    walletAddress: input.walletAddress,
    keepPairAddresses: records.map((record) => record.pairAddress),
  })

  return {
    poolsScanned: input.pools.length,
    userPositionsUpserted: records.length,
  }
}

