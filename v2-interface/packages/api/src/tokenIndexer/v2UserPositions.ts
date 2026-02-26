// where: @universe/api token indexer v2 user positions domain
// what: pure helpers for calculating per-wallet underlying token amounts from LP token balance
// why: keep wallet position math deterministic and testable without RPC or Supabase dependencies

import type { V2UserLpPositionRecord } from '@universe/api/src/tokenIndexer/types'

export interface V2LpPositionInput {
  readonly chainId: number
  readonly walletAddress: string
  readonly pairAddress: string
  readonly lpBalanceRaw: bigint
  readonly lpTotalSupplyRaw: bigint
  readonly reserve0Raw: bigint
  readonly reserve1Raw: bigint
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly updatedAtIso: string
}

export function computeUnderlyingRawAmounts(params: {
  readonly lpBalanceRaw: bigint
  readonly lpTotalSupplyRaw: bigint
  readonly reserve0Raw: bigint
  readonly reserve1Raw: bigint
}): { readonly amount0Raw: bigint; readonly amount1Raw: bigint } {
  if (params.lpBalanceRaw <= BigInt(0) || params.lpTotalSupplyRaw <= BigInt(0)) {
    return { amount0Raw: BigInt(0), amount1Raw: BigInt(0) }
  }

  return {
    amount0Raw: (params.lpBalanceRaw * params.reserve0Raw) / params.lpTotalSupplyRaw,
    amount1Raw: (params.lpBalanceRaw * params.reserve1Raw) / params.lpTotalSupplyRaw,
  }
}

export function buildV2UserLpPositionRecord(input: V2LpPositionInput): V2UserLpPositionRecord {
  const underlying = computeUnderlyingRawAmounts({
    lpBalanceRaw: input.lpBalanceRaw,
    lpTotalSupplyRaw: input.lpTotalSupplyRaw,
    reserve0Raw: input.reserve0Raw,
    reserve1Raw: input.reserve1Raw,
  })

  return {
    chainId: input.chainId,
    walletAddress: input.walletAddress.toLowerCase(),
    pairAddress: input.pairAddress.toLowerCase(),
    lpBalanceRaw: input.lpBalanceRaw.toString(),
    lpTotalSupplyRaw: input.lpTotalSupplyRaw.toString(),
    reserve0Raw: input.reserve0Raw.toString(),
    reserve1Raw: input.reserve1Raw.toString(),
    token0Address: input.token0Address.toLowerCase(),
    token1Address: input.token1Address.toLowerCase(),
    token0Symbol: input.token0Symbol,
    token1Symbol: input.token1Symbol,
    token0Decimals: input.token0Decimals,
    token1Decimals: input.token1Decimals,
    userAmount0Raw: underlying.amount0Raw.toString(),
    userAmount1Raw: underlying.amount1Raw.toString(),
    updatedAt: input.updatedAtIso,
  }
}
