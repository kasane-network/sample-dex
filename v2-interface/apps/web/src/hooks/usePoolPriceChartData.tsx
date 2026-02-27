import { BackendApi } from '@universe/api'
import { PriceChartData } from 'components/Charts/PriceChart'
import { ChartType } from 'components/Charts/utils'
import { ChartQueryResult, DataQuality } from 'components/Tokens/TokenDetails/ChartSection/util'
import { useMemo } from 'react'
import { hashKey } from 'utilities/src/reactQuery/hashKey'

export type PDPChartQueryVars = {
  addressOrId?: string
  chain: BackendApi.Chain
  duration: BackendApi.HistoryDuration
  isV2: boolean
  isV3: boolean
  isV4: boolean
}

export function usePoolPriceChartData({
  variables,
}: {
  variables?: PDPChartQueryVars
  priceInverted: boolean
}): ChartQueryResult<PriceChartData, ChartType.PRICE> {
  return useMemo(() => {
    const entries: PriceChartData[] = []
    return {
      chartType: ChartType.PRICE,
      entries,
      loading: false,
      dataQuality: variables?.addressOrId ? DataQuality.INVALID : DataQuality.VALID,
      dataHash: hashKey(entries),
    }
  }, [variables?.addressOrId])
}
