import { ChartType } from 'components/Charts/utils'
import { SingleHistogramData } from 'components/Charts/VolumeChart/renderer'
import { ChartQueryResult, DataQuality } from 'components/Tokens/TokenDetails/ChartSection/util'
import { PDPChartQueryVars } from 'hooks/usePoolPriceChartData'
import { useMemo } from 'react'

export function usePDPVolumeChartData({
  variables,
}: {
  variables: PDPChartQueryVars & { addressOrId: string }
}): ChartQueryResult<SingleHistogramData, ChartType.VOLUME> {
  return useMemo(() => {
    const entries: SingleHistogramData[] = []
    return {
      chartType: ChartType.VOLUME,
      entries,
      loading: false,
      dataQuality: variables.addressOrId ? DataQuality.INVALID : DataQuality.VALID,
    }
  }, [variables.addressOrId])
}
