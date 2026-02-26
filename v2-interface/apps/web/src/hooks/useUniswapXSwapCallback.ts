import { Percent } from '@uniswap/sdk-core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DutchOrderTrade,
  LimitOrderTrade,
  PriorityOrderTrade,
  TradeFillType,
  V2DutchOrderTrade,
  V3DutchOrderTrade,
} from 'state/routing/types'
import { InterfaceEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'

type UniswapXSwapResponse = {
  orderHash: string
  deadline: number
  encodedOrder: string
}

type UniswapXSwapResult = {
  type: TradeFillType.UniswapX | TradeFillType.UniswapXv2
  response: UniswapXSwapResponse
}

export function useUniswapXSwapCallback({
  trade,
  allowedSlippage,
  fiatValues,
}: {
  trade?: DutchOrderTrade | V2DutchOrderTrade | V3DutchOrderTrade | LimitOrderTrade | PriorityOrderTrade
  fiatValues: { amountIn?: number; amountOut?: number; feeUsd?: number }
  allowedSlippage: Percent
}) {
  const { t } = useTranslation()

  return useCallback(async (): Promise<UniswapXSwapResult> => {
    void trade
    void allowedSlippage
    void fiatValues

    sendAnalyticsEvent(InterfaceEventName.UniswapXOrderPostError, {
      detail: 'UniswapX order submission is disabled',
    })

    throw new Error(t('swap.fail.uniswapX'))
  }, [allowedSlippage, fiatValues, t, trade])
}
