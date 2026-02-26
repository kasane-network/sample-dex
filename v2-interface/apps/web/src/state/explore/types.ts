import { Percent } from '@uniswap/sdk-core'
import { GraphQLApi } from '@universe/api'
import { FeeData as CreatePositionFeeData } from 'components/Liquidity/Create/types'

type PricePoint = { timestamp: number; value: number }

export interface Amount {
  value: number
}

export interface PriceHistory {
  start: number
  step: number
  values: number[]
}

interface ExploreTokenProject {
  name?: string
}

export interface ExploreTokenRef {
  address: string
  chain: GraphQLApi.Chain | string
  symbol?: string
  name?: string
  decimals?: number
  standard?: GraphQLApi.TokenStandard
  logo?: string
  project?: {
    name?: string
  }
}

export interface TokenStat extends ExploreTokenRef {
  price?: Amount
  pricePercentChange1Hour?: Amount
  pricePercentChange1Day?: Amount
  fullyDilutedValuation?: Amount
  volume1Hour?: Amount
  volume1Day?: Amount
  volume1Week?: Amount
  volume1Month?: Amount
  volume1Year?: Amount
  priceHistoryHour?: PriceHistory
  priceHistoryDay?: PriceHistory
  priceHistoryWeek?: PriceHistory
  priceHistoryMonth?: PriceHistory
  priceHistoryYear?: PriceHistory
  project?: ExploreTokenProject
  priceHistory?: PricePoint[]
  feeData?: GraphQLApi.FeeData
  volume?: Amount
}

export interface PoolStat {
  id: string
  chain: GraphQLApi.Chain | string
  protocolVersion?: GraphQLApi.ProtocolVersion
  feeTier?: CreatePositionFeeData
  token0?: ExploreTokenRef
  token1?: ExploreTokenRef
  totalLiquidity?: Amount
  volume1Day?: Amount
  volume30Day?: Amount
  apr: Percent
  boostedApr?: number
  volOverTvl?: number
  hookAddress?: string
  hook?: { address?: string }
}

export interface ExploreStatsData {
  stats: {
    tokenStats: TokenStat[]
    poolStats: PoolStat[]
    poolStatsV2: PoolStat[]
    poolStatsV3: PoolStat[]
    poolStatsV4: PoolStat[]
  }
}
