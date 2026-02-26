import { formatSwapSignedAnalyticsEventProperties } from 'lib/utils/analytics'
import {
  addTransactionBreadcrumb,
  getSwapTransactionInfo,
  handleSignatureStep,
  TransactionBreadcrumbStatus,
} from 'state/sagas/transactions/utils'
import { call, SagaGenerator } from 'typed-redux-saga'
import { InterfaceEventName, SwapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { SwapTradeBaseProperties } from 'uniswap/src/features/telemetry/types'
import { HandledTransactionInterrupt } from 'uniswap/src/features/transactions/errors'
import {
  HandleSignatureStepParams,
  HandleUniswapXPlanSignatureStepParams,
} from 'uniswap/src/features/transactions/steps/types'
import { UniswapXSignatureStep } from 'uniswap/src/features/transactions/swap/steps/signOrder'
import { UniswapXTrade } from 'uniswap/src/features/transactions/swap/types/trade'
import { slippageToleranceToPercent } from 'uniswap/src/features/transactions/swap/utils/format'

interface HandleUniswapXSignatureStepParams extends HandleSignatureStepParams<UniswapXSignatureStep> {
  trade: UniswapXTrade
  analytics: SwapTradeBaseProperties
}

export function* handleUniswapXSignatureStep(params: HandleUniswapXSignatureStepParams) {
  const { analytics, step, trade } = params
  const { routing } = trade.quote

  const analyticsParams: Parameters<typeof formatSwapSignedAnalyticsEventProperties>[0] = {
    trade,
    allowedSlippage: slippageToleranceToPercent(trade.slippageTolerance),
    fiatValues: {
      amountIn: analytics.token_in_amount_usd,
      amountOut: analytics.token_out_amount_usd,
      feeUsd: analytics.fee_usd,
    },
    portfolioBalanceUsd: analytics.total_balances_usd,
    trace: { ...analytics },
  }

  sendAnalyticsEvent(
    InterfaceEventName.UniswapXSignatureRequested,
    formatSwapSignedAnalyticsEventProperties(analyticsParams),
  )

  yield* call(handleSignatureStep, params)

  checkDeadline(step.deadline)

  const swapInfo = getSwapTransactionInfo({
    trade,
    swapStartTimestamp: analytics.swap_start_timestamp,
  })
  addTransactionBreadcrumb({ step, data: { routing, ...swapInfo }, status: TransactionBreadcrumbStatus.InProgress })
  sendAnalyticsEvent(
    SwapEventName.SwapSigned,
    formatSwapSignedAnalyticsEventProperties({
      trade,
      allowedSlippage: slippageToleranceToPercent(trade.slippageTolerance),
      fiatValues: {
        amountIn: analytics.token_in_amount_usd,
        amountOut: analytics.token_out_amount_usd,
        feeUsd: analytics.fee_usd,
      },
      portfolioBalanceUsd: analytics.total_balances_usd,
      trace: { ...analytics },
    }),
  )

  sendAnalyticsEvent(InterfaceEventName.UniswapXOrderPostError, {
    ...formatSwapSignedAnalyticsEventProperties(analyticsParams),
    detail: 'UniswapX order submission is disabled',
  })
  throw new HandledTransactionInterrupt('UniswapX order submission is disabled')
}

export function* handleUniswapXPlanSignatureStep(params: HandleUniswapXPlanSignatureStepParams): SagaGenerator<string> {
  const { step } = params

  // Check before requiring user to sign an expired deadline
  checkDeadline(step.deadline)

  // TODO: SWAP-446 address analytics InterfaceEventName.UniswapXSignatureRequested

  const signature = yield* call(handleSignatureStep, params)

  // Check again after user has signed to ensure they didn't sign after the deadline
  checkDeadline(step.deadline)

  // TODO: SWAP-446 address analytics SwapEventName.SwapSigned
  return signature
}

/**
 * Helper function to check a signature deadline.
 *
 * @throws {HandledTransactionInterrupt} if the deadline has expired
 * @param deadline
 */
const checkDeadline = (deadlineSeconds: number) => {
  if (Date.now() / 1000 > deadlineSeconds) {
    throw new HandledTransactionInterrupt('User signed after deadline')
  }
}
