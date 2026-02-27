import { BackendApi } from '@universe/api'
import { PriceChartData } from 'components/Charts/PriceChart'
import { StackedLineData } from 'components/Charts/StackedLineChart'
import { ChartType, PriceChartType } from 'components/Charts/utils'
import { SingleHistogramData } from 'components/Charts/VolumeChart/renderer'
import { ChartQueryResult, DataQuality } from 'components/Tokens/TokenDetails/ChartSection/util'
import { useMemo } from 'react'

type TDPChartQueryVariables = { chain: BackendApi.Chain; address?: string; duration: BackendApi.HistoryDuration }

export function useTDPPriceChartData({
  variables,
}: {
  variables: TDPChartQueryVariables
  skip: boolean
  priceChartType: PriceChartType
}): ChartQueryResult<PriceChartData, ChartType.PRICE> & { disableCandlestickUI: boolean } {
  return useMemo(() => {
    const entries: PriceChartData[] = []
    return {
      chartType: ChartType.PRICE,
      entries,
      loading: false,
      dataQuality: variables.address ? DataQuality.INVALID : DataQuality.VALID,
      disableCandlestickUI: true,
    }
  }, [variables.address])
}

export function useTDPVolumeChartData(
  variables: TDPChartQueryVariables,
  _skip: boolean,
): ChartQueryResult<SingleHistogramData, ChartType.VOLUME> {
  return useMemo(() => {
    const entries: SingleHistogramData[] = []
    return {
      chartType: ChartType.VOLUME,
      entries,
      loading: false,
      dataQuality: variables.address ? DataQuality.INVALID : DataQuality.VALID,
    }
  }, [variables.address])
}

export function useTDPTVLChartData(
  variables: TDPChartQueryVariables,
  _skip: boolean,
): ChartQueryResult<StackedLineData, ChartType.TVL> {
  return useMemo(() => {
    const entries: StackedLineData[] = []
    return {
      chartType: ChartType.TVL,
      entries,
      loading: false,
      dataQuality: variables.address ? DataQuality.INVALID : DataQuality.VALID,
    }
  }, [variables.address])
}
