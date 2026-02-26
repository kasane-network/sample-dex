import { GraphQLApi } from '@universe/api'
import { FeeData } from 'components/Liquidity/Create/types'

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
  protocolVersion?: GraphQLApi.ProtocolVersion
  hookAddress?: string
  token0: GraphQLApi.Token
  tvlToken0?: number
  token0Price?: number
  token1: GraphQLApi.Token
  tvlToken1?: number
  token1Price?: number
  volumeUSD24H?: number
  volumeUSD24HChange?: number
  tvlUSD?: number
  tvlUSDChange?: number
  rewardsCampaign?: RewardsCampaign
}

export function usePoolData(_params: {
  poolIdOrAddress: string
  chainId?: number
  isPoolAddress: boolean
}): { loading: boolean; error: boolean; data?: PoolData } {
  return {
    loading: false,
    error: false,
    data: undefined,
  }
}
