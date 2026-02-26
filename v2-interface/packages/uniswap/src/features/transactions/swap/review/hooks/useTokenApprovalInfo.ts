import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { TradingApi } from '@universe/api'
import { useMemo } from 'react'
import { Interface } from 'ethers/lib/utils'
import { useUniswapContextSelector } from 'uniswap/src/contexts/UniswapContext'
import { useCheckApprovalQuery } from 'uniswap/src/data/apiClients/tradingApi/useCheckApprovalQuery'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { convertGasFeeToDisplayValue, useActiveGasStrategy } from 'uniswap/src/features/gas/hooks'
import { GasFeeResult } from 'uniswap/src/features/gas/types'
import { ApprovalAction, TokenApprovalInfo } from 'uniswap/src/features/transactions/swap/types/trade'
import { isUniswapX } from 'uniswap/src/features/transactions/swap/utils/routing'
import {
  getTokenAddressForApi,
  toTradingApiSupportedChainId,
} from 'uniswap/src/features/transactions/swap/utils/tradingApi'
import { WrapType } from 'uniswap/src/features/transactions/types/wrap'
import { AccountDetails } from 'uniswap/src/features/wallet/types/AccountDetails'
import { logger } from 'utilities/src/logger/logger'
import { ONE_MINUTE_MS, ONE_SECOND_MS } from 'utilities/src/time/time'

const KASANE_V2_ROUTER02_ADDRESS = '0xe5455e558b8701a32b12f8881ff72a35d771b672'
const ERC20_APPROVE_INTERFACE = new Interface(['function approve(address spender, uint256 amount)'])
const ERC20_MAX_ALLOWANCE = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

export interface TokenApprovalInfoParams {
  chainId: UniverseChainId
  wrapType: WrapType
  currencyInAmount: Maybe<CurrencyAmount<Currency>>
  currencyOutAmount?: Maybe<CurrencyAmount<Currency>>
  routing: TradingApi.Routing | undefined
  account?: AccountDetails
}

export type ApprovalTxInfo = {
  tokenApprovalInfo: TokenApprovalInfo
  approvalGasFeeResult: GasFeeResult
  revokeGasFeeResult: GasFeeResult
}

function useApprovalWillBeBatchedWithSwap(chainId: UniverseChainId, routing: TradingApi.Routing | undefined): boolean {
  const canBatchTransactions = useUniswapContextSelector((ctx) => ctx.getCanBatchTransactions?.(chainId))
  const swapDelegationInfo = useUniswapContextSelector((ctx) => ctx.getSwapDelegationInfo?.(chainId))

  const isBatchableFlow = Boolean(routing && !isUniswapX({ routing }))

  return Boolean((canBatchTransactions || swapDelegationInfo?.delegationAddress) && isBatchableFlow)
}

export function useTokenApprovalInfo(params: TokenApprovalInfoParams): ApprovalTxInfo {
  const { account, chainId, wrapType, currencyInAmount, currencyOutAmount, routing } = params

  const isWrap = wrapType !== WrapType.NotApplicable
  /** Approval is included elsewhere for Chained Actions so it can be skipped */
  const isChained = routing === TradingApi.Routing.CHAINED

  const address = account?.address
  const inputWillBeWrapped = routing && isUniswapX({ routing })
  // Off-chain orders must have wrapped currencies approved, rather than natives.
  const currencyIn = inputWillBeWrapped ? currencyInAmount?.currency.wrapped : currencyInAmount?.currency
  const isNativeInput = Boolean(currencyIn?.isNative)
  const amount = currencyInAmount?.quotient.toString()

  const tokenInAddress = getTokenAddressForApi(currencyIn)

  // Only used for bridging
  const isBridge = routing === TradingApi.Routing.BRIDGE
  const currencyOut = currencyOutAmount?.currency
  const tokenOutAddress = getTokenAddressForApi(currencyOut)

  const gasStrategy = useActiveGasStrategy(chainId, 'general')

  const approvalRequestArgs: TradingApi.ApprovalRequest | undefined = useMemo(() => {
    const tokenInChainId = toTradingApiSupportedChainId(chainId)
    const tokenOutChainId = toTradingApiSupportedChainId(currencyOut?.chainId)

    if (!address || !amount || !currencyIn || !tokenInAddress || !tokenInChainId) {
      return undefined
    }
    if (isBridge && !tokenOutAddress && !tokenOutChainId) {
      return undefined
    }

    return {
      walletAddress: address,
      token: tokenInAddress,
      amount,
      chainId: tokenInChainId,
      includeGasInfo: true,
      tokenOut: tokenOutAddress,
      tokenOutChainId,
      gasStrategies: [gasStrategy],
    }
  }, [
    gasStrategy,
    address,
    amount,
    chainId,
    currencyIn,
    currencyOut?.chainId,
    isBridge,
    tokenInAddress,
    tokenOutAddress,
  ])

  const approvalWillBeBatchedWithSwap = useApprovalWillBeBatchedWithSwap(chainId, routing)
  const isKasaneClassicErc20Input =
    chainId === UniverseChainId.Kasane &&
    routing === TradingApi.Routing.CLASSIC &&
    !isWrap &&
    !isNativeInput &&
    !approvalWillBeBatchedWithSwap &&
    !isChained &&
    Boolean(address) &&
    Boolean(tokenInAddress)
  const shouldSkip =
    !approvalRequestArgs ||
    isWrap ||
    !address ||
    approvalWillBeBatchedWithSwap ||
    isChained ||
    isNativeInput ||
    isKasaneClassicErc20Input

  const { data, isLoading, error } = useCheckApprovalQuery({
    params: shouldSkip ? undefined : approvalRequestArgs,
    staleTime: 15 * ONE_SECOND_MS,
    immediateGcTime: ONE_MINUTE_MS,
  })

  const tokenApprovalInfo: TokenApprovalInfo = useMemo(() => {
    if (error) {
      logger.error(error, {
        tags: { file: 'useTokenApprovalInfo', function: 'useTokenApprovalInfo' },
        extra: {
          approvalRequestArgs,
        },
      })
    }

    // Approval is N/A for wrap transactions or unconnected state.
    if (isWrap || !address || approvalWillBeBatchedWithSwap || isChained || isNativeInput) {
      return {
        action: ApprovalAction.None,
        txRequest: null,
        cancelTxRequest: null,
      }
    }

    if (isKasaneClassicErc20Input && tokenInAddress) {
      return {
        action: ApprovalAction.Permit2Approve,
        txRequest: {
          to: tokenInAddress,
          from: address,
          chainId,
          data: ERC20_APPROVE_INTERFACE.encodeFunctionData('approve', [
            KASANE_V2_ROUTER02_ADDRESS,
            ERC20_MAX_ALLOWANCE,
          ]),
          value: '0',
        },
        cancelTxRequest: null,
      }
    }

    if (data && !error) {
      // API returns null if no approval is required

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (data.approval === null) {
        return {
          action: ApprovalAction.None,
          txRequest: null,
          cancelTxRequest: null,
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (data.approval) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (data.cancel) {
          return {
            action: ApprovalAction.RevokeAndPermit2Approve,
            txRequest: data.approval,
            cancelTxRequest: data.cancel,
          }
        }

        return {
          action: ApprovalAction.Permit2Approve,
          txRequest: data.approval,
          cancelTxRequest: null,
        }
      }
    }

    // Kasane only: during transient states (e.g. routing not resolved yet), avoid surfacing Unknown.
    if (chainId === UniverseChainId.Kasane && shouldSkip) {
      return {
        action: ApprovalAction.None,
        txRequest: null,
        cancelTxRequest: null,
      }
    }

    // No valid approval type found
    logger.warn('useTokenApprovalInfo', 'useTokenApprovalInfo', 'approval type resolved to Unknown', {
      chainId,
      routing,
      isKasaneClassicErc20Input,
      hasAddress: Boolean(address),
      hasAmount: Boolean(amount),
      hasCurrencyIn: Boolean(currencyIn),
      hasTokenInAddress: Boolean(tokenInAddress),
      shouldSkip,
    })
    return {
      action: ApprovalAction.Unknown,
      txRequest: null,
      cancelTxRequest: null,
    }
  }, [
    amount,
    chainId,
    currencyIn,
    address,
    approvalRequestArgs,
    approvalWillBeBatchedWithSwap,
    data,
    error,
    isWrap,
    isChained,
    isKasaneClassicErc20Input,
    isNativeInput,
    routing,
    shouldSkip,
    tokenInAddress,
  ])

  return useMemo(() => {
    const gasEstimate = data?.gasEstimates?.[0]
    const noApprovalNeeded = tokenApprovalInfo.action === ApprovalAction.None
    const noRevokeNeeded =
      tokenApprovalInfo.action === ApprovalAction.Permit2Approve || tokenApprovalInfo.action === ApprovalAction.None
    const approvalFee = noApprovalNeeded ? '0' : isKasaneClassicErc20Input ? '0' : data?.gasFee
    const revokeFee = noRevokeNeeded ? '0' : data?.cancelGasFee

    const unknownApproval = tokenApprovalInfo.action === ApprovalAction.Unknown
    const isGasLoading = unknownApproval && isLoading
    const approvalGasError = unknownApproval && !isLoading ? new Error('Approval action unknown') : null

    return {
      tokenApprovalInfo,
      approvalGasFeeResult: {
        value: approvalFee,
        displayValue: convertGasFeeToDisplayValue(approvalFee, gasStrategy),
        isLoading: isGasLoading,
        error: approvalGasError,
        gasEstimate,
      },
      revokeGasFeeResult: {
        value: revokeFee,
        displayValue: convertGasFeeToDisplayValue(revokeFee, gasStrategy),
        isLoading: isGasLoading,
        error: approvalGasError,
      },
    }
  }, [gasStrategy, data?.cancelGasFee, data?.gasEstimates, data?.gasFee, isKasaneClassicErc20Input, isLoading, tokenApprovalInfo])
}
