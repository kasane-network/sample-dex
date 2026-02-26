import type { PresetPercentage } from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/types'
import type { SwapTxStoreState } from 'uniswap/src/features/transactions/swap/stores/swapTxStore/createSwapTxStore'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import type { SwapCallbackParams } from 'uniswap/src/features/transactions/swap/types/swapCallback'
import type {
  ExecuteSwapCallback,
  PrepareSwapCallback,
} from 'uniswap/src/features/transactions/swap/types/swapHandlers'
import type { SwapTxAndGasInfo } from 'uniswap/src/features/transactions/swap/types/swapTxAndGasInfo'
import { isValidSwapTxContext } from 'uniswap/src/features/transactions/swap/types/swapTxAndGasInfo'
import { AccountDetails, isSignerMnemonicAccountDetails } from 'uniswap/src/features/wallet/types/AccountDetails'
import { CurrencyField } from 'uniswap/src/types/currency'
import { logger } from 'utilities/src/logger/logger'

type ExecuteSwap = () => void

export interface ExecuteSwapService {
  executeSwap: ExecuteSwap
}

export type GetExecuteSwapService = (ctx: {
  onSuccess: () => void
  onFailure: () => void
  onPending: () => void
  setCurrentStep: SwapCallbackParams['setCurrentStep']
  setSteps: SwapCallbackParams['setSteps']
  getSwapTxContext: () => SwapTxAndGasInfo
}) => ExecuteSwapService

function getSwapTxContextInvalidReasons(swapTxContext: SwapTxAndGasInfo | undefined): string[] {
  if (!swapTxContext) {
    return ['missing_swap_tx_context']
  }

  const reasons: string[] = []

  if (!swapTxContext.trade) {
    reasons.push('missing_trade')
  }
  if (!swapTxContext.gasFee.value) {
    reasons.push('missing_gas_fee_value')
  }
  if (swapTxContext.gasFee.error) {
    reasons.push(`gas_fee_error:${swapTxContext.gasFee.error.message}`)
  }

  if ('txRequests' in swapTxContext && !swapTxContext.txRequests) {
    reasons.push('missing_tx_requests')
  }

  return reasons
}

export function createExecuteSwapService(ctx: {
  getAccount?: () => AccountDetails | undefined
  getSwapTxContext?: () => SwapTxStoreState
  getDerivedSwapInfo: () => DerivedSwapInfo
  getTxSettings: () => { customSlippageTolerance?: number }
  getIsFiatMode?: () => boolean
  getPresetInfo: () => { presetPercentage: PresetPercentage | undefined; preselectAsset: boolean | undefined }
  onSuccess: () => void
  onFailure: (error?: Error) => void
  onPending: () => void
  setCurrentStep: SwapCallbackParams['setCurrentStep']
  setSteps: SwapCallbackParams['setSteps']
  onPrepareSwap: PrepareSwapCallback
  onExecuteSwap: ExecuteSwapCallback
}): { executeSwap: ExecuteSwap } {
  // Unified execution pattern - handles both swaps and wraps through SwapHandlers
  return {
    executeSwap: (): void => {
      const { currencyAmounts, currencyAmountsUSDValue, txId, wrapType } = ctx.getDerivedSwapInfo()
      const { customSlippageTolerance } = ctx.getTxSettings()
      const swapTxContext = ctx.getSwapTxContext?.()
      const account = ctx.getAccount?.()

      if (
        !account ||
        !swapTxContext ||
        !isSignerMnemonicAccountDetails(account) ||
        !isValidSwapTxContext(swapTxContext)
      ) {
        const invalidReasons = getSwapTxContextInvalidReasons(swapTxContext)
        logger.warn('executeSwapService', 'executeSwap', 'skip executeSwap before wallet prompt', {
          hasAccount: Boolean(account),
          hasSwapTxContext: Boolean(swapTxContext),
          isSignerMnemonicAccount: account ? isSignerMnemonicAccountDetails(account) : false,
          isValidSwapTxContext: swapTxContext ? isValidSwapTxContext(swapTxContext) : false,
          invalidReasons,
          gasFeeValue: swapTxContext?.gasFee.value,
          gasFeeErrorMessage: swapTxContext?.gasFee.error?.message,
          hasTrade: Boolean(swapTxContext?.trade),
          hasTxRequests: swapTxContext && 'txRequests' in swapTxContext ? Boolean(swapTxContext.txRequests) : undefined,
          txRequestsLength:
            swapTxContext && 'txRequests' in swapTxContext && swapTxContext.txRequests
              ? swapTxContext.txRequests.length
              : undefined,
          chainId: swapTxContext?.trade?.inputAmount.currency.chainId,
          routing: swapTxContext?.routing,
        })
        ctx.onFailure(
          new Error(
            !account
              ? 'No account available'
              : !swapTxContext
                ? 'Missing swap transaction context'
                : !isSignerMnemonicAccountDetails(account)
                  ? 'Invalid account type - must be signer mnemonic account'
                  : 'Invalid swap transaction context',
          ),
        )
        return
      }

      const { presetPercentage, preselectAsset } = ctx.getPresetInfo()

      void ctx
        .onExecuteSwap({
          account,
          swapTxContext,
          currencyInAmountUSD: currencyAmountsUSDValue[CurrencyField.INPUT] ?? undefined,
          currencyOutAmountUSD: currencyAmountsUSDValue[CurrencyField.OUTPUT] ?? undefined,
          isAutoSlippage: !customSlippageTolerance,
          presetPercentage,
          preselectAsset,
          onSuccess: ctx.onSuccess,
          onFailure: ctx.onFailure,
          onPending: ctx.onPending,
          txId,
          setCurrentStep: ctx.setCurrentStep,
          setSteps: ctx.setSteps,
          isFiatInputMode: ctx.getIsFiatMode?.(),
          wrapType,
          inputCurrencyAmount: currencyAmounts.input ?? undefined,
        })
        .catch((error: unknown) => {
          ctx.onFailure(error instanceof Error ? error : new Error('onExecuteSwap rejected'))
        })
    },
  }
}
