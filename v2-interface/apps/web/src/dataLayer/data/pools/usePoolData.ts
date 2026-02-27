/**
 * where: pool details data hook
 * what: builds Kasane V2 pool details from on-chain pair/token reads and optional Supabase snapshot enrichment
 * why: GraphQL-backed pool details are unavailable in this environment, so pool page needs a direct fallback
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BackendApi } from '@universe/api'
import { FeeData } from 'components/Liquidity/Create/types'
import {
  bigintToNumber,
  getSupabasePoolSnapshot,
  resolveSupabaseConfig,
  V2_PAIR_ABI,
} from 'dataLayer/data/pools/usePoolData.helpers'
import { V2_DEFAULT_FEE_TIER } from 'uniswap/src/constants/pools'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toGraphQLChain } from 'uniswap/src/features/chains/utils'
import { assume0xAddress } from 'utils/wagmi'
import { erc20Abi } from 'viem'
import { useReadContracts } from 'wagmi'

interface RewardsCampaign {
  id: string
  boostedApr: number
  startTimestamp?: number
  endTimestamp?: number
  totalRewardAllocation?: string
  distributedRewards?: string
}

export interface PoolData {
  idOrAddress: string
  feeTier?: FeeData
  txCount?: number
  protocolVersion?: BackendApi.ProtocolVersion
  hookAddress?: string
  token0: BackendApi.Token
  tvlToken0?: number
  token0Price?: number
  token1: BackendApi.Token
  tvlToken1?: number
  token1Price?: number
  volumeUSD24H?: number
  volumeUSD24HChange?: number
  tvlUSD?: number
  tvlUSDChange?: number
  rewardsCampaign?: RewardsCampaign
}

export function usePoolData(params: {
  poolIdOrAddress: string
  chainId?: number
  isPoolAddress: boolean
}): { loading: boolean; error: boolean; data?: PoolData } {
  const isKasaneV2Address = params.isPoolAddress && params.chainId === UniverseChainId.Kasane && !!params.poolIdOrAddress
  const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig()

  const pairReads = useReadContracts({
    contracts: [
      {
        address: assume0xAddress(params.poolIdOrAddress) ?? '0x',
        abi: V2_PAIR_ABI,
        functionName: 'token0',
        chainId: params.chainId,
      },
      {
        address: assume0xAddress(params.poolIdOrAddress) ?? '0x',
        abi: V2_PAIR_ABI,
        functionName: 'token1',
        chainId: params.chainId,
      },
      {
        address: assume0xAddress(params.poolIdOrAddress) ?? '0x',
        abi: V2_PAIR_ABI,
        functionName: 'getReserves',
        chainId: params.chainId,
      },
      {
        address: assume0xAddress(params.poolIdOrAddress) ?? '0x',
        abi: V2_PAIR_ABI,
        functionName: 'totalSupply',
        chainId: params.chainId,
      },
    ],
    query: {
      enabled: isKasaneV2Address,
    },
  })

  const token0AddressResult = pairReads.data?.[0]?.result
  const token1AddressResult = pairReads.data?.[1]?.result
  const reservesResult = pairReads.data?.[2]?.result
  const totalSupplyResult = pairReads.data?.[3]?.result

  const token0Address = typeof token0AddressResult === 'string' ? token0AddressResult : undefined
  const token1Address = typeof token1AddressResult === 'string' ? token1AddressResult : undefined
  const hasReservesTuple = Array.isArray(reservesResult) && reservesResult.length >= 2
  const reserve0 = hasReservesTuple && typeof reservesResult[0] === 'bigint' ? reservesResult[0] : undefined
  const reserve1 = hasReservesTuple && typeof reservesResult[1] === 'bigint' ? reservesResult[1] : undefined
  const totalSupply = typeof totalSupplyResult === 'bigint' ? totalSupplyResult : undefined

  const tokenReads = useReadContracts({
    contracts:
      token0Address && token1Address
        ? [
            { address: assume0xAddress(token0Address), abi: erc20Abi, functionName: 'symbol', chainId: params.chainId },
            { address: assume0xAddress(token0Address), abi: erc20Abi, functionName: 'name', chainId: params.chainId },
            {
              address: assume0xAddress(token0Address),
              abi: erc20Abi,
              functionName: 'decimals',
              chainId: params.chainId,
            },
            { address: assume0xAddress(token1Address), abi: erc20Abi, functionName: 'symbol', chainId: params.chainId },
            { address: assume0xAddress(token1Address), abi: erc20Abi, functionName: 'name', chainId: params.chainId },
            {
              address: assume0xAddress(token1Address),
              abi: erc20Abi,
              functionName: 'decimals',
              chainId: params.chainId,
            },
          ]
        : [],
    query: {
      enabled: isKasaneV2Address && !!token0Address && !!token1Address,
    },
  })

  const snapshotQuery = useQuery({
    queryKey: ['pool-details-supabase-snapshot', params.chainId, params.poolIdOrAddress.toLowerCase()],
    enabled: isKasaneV2Address,
    queryFn: () =>
      getSupabasePoolSnapshot({
        supabaseUrl,
        supabaseAnonKey,
        chainId: params.chainId ?? UniverseChainId.Kasane,
        poolAddress: params.poolIdOrAddress,
      }),
  })

  const poolData = useMemo((): PoolData | undefined => {
    if (!isKasaneV2Address || !params.chainId || !token0Address || !token1Address || reserve0 === undefined || reserve1 === undefined) {
      return undefined
    }

    const token0Symbol = typeof tokenReads.data?.[0]?.result === 'string' ? tokenReads.data[0].result : undefined
    const token0Name = typeof tokenReads.data?.[1]?.result === 'string' ? tokenReads.data[1].result : undefined
    const token0Decimals = typeof tokenReads.data?.[2]?.result === 'number' ? tokenReads.data[2].result : undefined
    const token1Symbol = typeof tokenReads.data?.[3]?.result === 'string' ? tokenReads.data[3].result : undefined
    const token1Name = typeof tokenReads.data?.[4]?.result === 'string' ? tokenReads.data[4].result : undefined
    const token1Decimals = typeof tokenReads.data?.[5]?.result === 'number' ? tokenReads.data[5].result : undefined

    const snapshot = snapshotQuery.data
    const resolvedToken0Decimals = token0Decimals ?? snapshot?.token0_decimals ?? 18
    const resolvedToken1Decimals = token1Decimals ?? snapshot?.token1_decimals ?? 18
    const reserve0Float = bigintToNumber(reserve0, resolvedToken0Decimals)
    const reserve1Float = bigintToNumber(reserve1, resolvedToken1Decimals)
    const token0PriceFromRatio = reserve0Float > 0 ? reserve1Float / reserve0Float : undefined
    const token1PriceFromRatio = reserve1Float > 0 ? reserve0Float / reserve1Float : undefined
    const token0PriceFromTvl = snapshot?.tvl_usd && reserve0Float > 0 ? snapshot.tvl_usd / 2 / reserve0Float : undefined
    const token1PriceFromTvl = snapshot?.tvl_usd && reserve1Float > 0 ? snapshot.tvl_usd / 2 / reserve1Float : undefined

    return {
      idOrAddress: params.poolIdOrAddress.toLowerCase(),
      protocolVersion: BackendApi.ProtocolVersion.V2,
      feeTier: {
        feeAmount: snapshot?.fee_tier_bps ?? V2_DEFAULT_FEE_TIER,
        isDynamic: false,
        tickSpacing: 0,
      },
      token0: {
        id: token0Address.toLowerCase(),
        address: token0Address.toLowerCase(),
        chain: toGraphQLChain(params.chainId),
        symbol: token0Symbol ?? snapshot?.token0_symbol ?? 'TOKEN0',
        name: token0Name ?? snapshot?.token0_name ?? token0Symbol ?? 'Token 0',
        decimals: resolvedToken0Decimals,
        standard: BackendApi.TokenStandard.Erc20,
        project: {
          id: `${token0Address.toLowerCase()}-project`,
          name: token0Name ?? snapshot?.token0_name ?? token0Symbol ?? 'Token 0',
          tokens: [],
          logo: snapshot?.token0_logo_uri ? { id: snapshot.token0_logo_uri, url: snapshot.token0_logo_uri } : undefined,
        },
      },
      token1: {
        id: token1Address.toLowerCase(),
        address: token1Address.toLowerCase(),
        chain: toGraphQLChain(params.chainId),
        symbol: token1Symbol ?? snapshot?.token1_symbol ?? 'TOKEN1',
        name: token1Name ?? snapshot?.token1_name ?? token1Symbol ?? 'Token 1',
        decimals: resolvedToken1Decimals,
        standard: BackendApi.TokenStandard.Erc20,
        project: {
          id: `${token1Address.toLowerCase()}-project`,
          name: token1Name ?? snapshot?.token1_name ?? token1Symbol ?? 'Token 1',
          tokens: [],
          logo: snapshot?.token1_logo_uri ? { id: snapshot.token1_logo_uri, url: snapshot.token1_logo_uri } : undefined,
        },
      },
      token0Price: token0PriceFromTvl ?? token0PriceFromRatio,
      token1Price: token1PriceFromTvl ?? token1PriceFromRatio,
      tvlToken0: reserve0Float,
      tvlToken1: reserve1Float,
      tvlUSD: snapshot?.tvl_usd,
      volumeUSD24H: snapshot?.volume_24h_usd,
      txCount: totalSupply ? Number(totalSupply) : undefined,
    }
  }, [
    isKasaneV2Address,
    params.chainId,
    params.poolIdOrAddress,
    reserve0,
    reserve1,
    snapshotQuery.data,
    token0Address,
    token1Address,
    tokenReads.data,
    totalSupply,
  ])

  if (!isKasaneV2Address) {
    return { loading: false, error: false, data: undefined }
  }

  return {
    loading: pairReads.isLoading || tokenReads.isLoading || snapshotQuery.isLoading,
    error: Boolean(pairReads.error || tokenReads.error || snapshotQuery.error),
    data: poolData,
  }
}
