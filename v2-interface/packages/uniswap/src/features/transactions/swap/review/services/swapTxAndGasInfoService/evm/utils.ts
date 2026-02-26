import { TradeType } from '@uniswap/sdk-core'
import { BigNumber, providers } from 'ethers'
import { defaultAbiCoder, getAddress, Interface, parseUnits } from 'ethers/lib/utils'
import type { GasStrategy } from '@universe/api'
import { DEFAULT_CUSTOM_DEADLINE } from 'uniswap/src/constants/transactions'
import { getTradeSettingsDeadline } from 'uniswap/src/data/apiClients/tradingApi/utils/getTradeSettingsDeadline'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { RPCType, UniverseChainId } from 'uniswap/src/features/chains/types'
import type { TransactionSettings } from 'uniswap/src/features/transactions/components/settings/types'
import type { ApprovalTxInfo } from 'uniswap/src/features/transactions/swap/review/hooks/useTokenApprovalInfo'
import type { EVMSwapInstructionsService } from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/evm/evmSwapInstructionsService'
import type { TransactionRequestInfo } from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/utils'
import {
  createProcessSwapResponse,
  getSwapInputExceedsBalance,
} from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/utils'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import type {
  BridgeTrade,
  ClassicTrade,
  UnwrapTrade,
  WrapTrade,
} from 'uniswap/src/features/transactions/swap/types/trade'
import { ApprovalAction, KasaneV2Trade } from 'uniswap/src/features/transactions/swap/types/trade'
import { tryCatch } from 'utilities/src/errors'

const KASANE_V2_ROUTER02_ADDRESS = getAddress('0xe5455e558b8701a32b12f8881ff72a35d771b672')
const KASANE_MIN_MAX_FEE_PER_GAS_GWEI = '250'
const KASANE_MIN_MAX_PRIORITY_FEE_PER_GAS_GWEI = '250'
const KASANE_WRAPPED_NATIVE_INTERFACE = new Interface([
  'function deposit() payable',
  'function withdraw(uint256 amount)',
])
const KASANE_V2_ROUTER02_INTERFACE = new Interface([
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)',
  'function swapETHForExactTokens(uint amountOut, address[] path, address to, uint deadline)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
  'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
  'function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)',
])

export function buildKasaneNativeWrapTx(params: {
  isNativeToWrapped: boolean
  isWrappedToNative: boolean
  wrappedNative: string
  from: string
  chainId: number
  amountIn: bigint
  amountOut: bigint
}):
  | {
      to: string
      from: string
      chainId: number
      data: string
      value: string
    }
  | undefined {
  const { isNativeToWrapped, isWrappedToNative, wrappedNative, from, chainId, amountIn, amountOut } = params
  if (!isNativeToWrapped && !isWrappedToNative) {
    return undefined
  }
  if (amountIn !== amountOut) {
    return undefined
  }

  return {
    to: wrappedNative,
    from,
    chainId,
    data: isNativeToWrapped
      ? KASANE_WRAPPED_NATIVE_INTERFACE.encodeFunctionData('deposit', [])
      : KASANE_WRAPPED_NATIVE_INTERFACE.encodeFunctionData('withdraw', [amountIn]),
    value: isNativeToWrapped ? amountIn.toString() : '0',
  }
}

export function hasKasaneDuplicatedPathEndpoints(path: string[]): boolean {
  return path.length > 0 && path[0] === path[path.length - 1]
}

type GetEVMSwapTransactionRequestInfoFn = (params: {
  trade: ClassicTrade | BridgeTrade | WrapTrade | UnwrapTrade | KasaneV2Trade
  approvalTxInfo: ApprovalTxInfo
  derivedSwapInfo: DerivedSwapInfo
}) => Promise<TransactionRequestInfo>

export function createGetEVMSwapTransactionRequestInfo(ctx: {
  instructionService: EVMSwapInstructionsService
  gasStrategy: GasStrategy
  transactionSettings: TransactionSettings
}): GetEVMSwapTransactionRequestInfoFn {
  const { gasStrategy, transactionSettings, instructionService } = ctx

  const processSwapResponse = createProcessSwapResponse({ gasStrategy })

  const getEVMSwapTransactionRequestInfo: GetEVMSwapTransactionRequestInfoFn = async ({
    trade,
    approvalTxInfo,
    derivedSwapInfo,
  }) => {
    const { tokenApprovalInfo } = approvalTxInfo

    const swapQuoteResponse = trade.quote
    const swapQuote = swapQuoteResponse.quote

    const approvalAction = tokenApprovalInfo.action
    const approvalUnknown = approvalAction === ApprovalAction.Unknown

    const approvalRequiredForKasaneTrade = !(trade instanceof KasaneV2Trade) || !trade.inputAmount.currency.isNative
    const skip = getSwapInputExceedsBalance({ derivedSwapInfo }) || (approvalUnknown && approvalRequiredForKasaneTrade)
    if (trade instanceof KasaneV2Trade) {
      if (skip) {
        return {
          gasFeeResult: {
            value: undefined,
            displayValue: undefined,
            isLoading: false,
            error: null,
          },
          txRequests: undefined,
          gasEstimate: {},
          swapRequestArgs: undefined,
        }
      }

      return await createKasaneRpcSwapTxRequestInfo({
        trade,
        transactionSettings,
        approvalAction,
      })
    }

    const { data, error } = await tryCatch(
      skip
        ? Promise.resolve(undefined)
        : instructionService.getSwapInstructions({ swapQuoteResponse, transactionSettings, approvalAction }),
    )

    const isRevokeNeeded = tokenApprovalInfo.action === ApprovalAction.RevokeAndPermit2Approve
    const swapTxInfo = processSwapResponse({
      response: data?.response ?? undefined,
      error,
      permitData: data?.unsignedPermit,
      swapQuote,
      isSwapLoading: false,
      isRevokeNeeded,
      swapRequestParams: data?.swapRequestParams ?? undefined,
    })

    return swapTxInfo
  }

  return getEVMSwapTransactionRequestInfo
}

async function createKasaneRpcSwapTxRequestInfo({
  trade,
  transactionSettings,
  approvalAction,
}: {
  trade: KasaneV2Trade
  transactionSettings: TransactionSettings
  approvalAction: ApprovalAction
}): Promise<TransactionRequestInfo> {
  const chainId = trade.inputAmount.currency.chainId
  if (chainId !== UniverseChainId.Kasane) {
    throw new Error('Kasane RPC swap tx builder called for non-Kasane trade')
  }

  const bps = getSlippageBps(transactionSettings.customSlippageTolerance ?? trade.slippageTolerance)
  const path = trade.routePath.map((address) => getAddress(address))
  if (path.length < 2) {
    throw new Error('Kasane swap route path must contain at least 2 addresses')
  }
  const to = getAddress(trade.quote.output.recipient)
  const from = to
  const deadline =
    getTradeSettingsDeadline(transactionSettings.customDeadline) ??
    Math.floor(Date.now() / 1000) + DEFAULT_CUSTOM_DEADLINE * 60
  const amountIn = BigInt(trade.inputAmount.quotient.toString())
  const amountOut = BigInt(trade.outputAmount.quotient.toString())
  const amountOutMin = applyNegativeSlippage(amountOut, bps)
  const amountInMax = applyPositiveSlippage(amountIn, bps)
  const wrappedNative = getAddress(getChainInfo(chainId).wrappedNativeCurrency.address)
  const isNativeToWrapped =
    trade.inputAmount.currency.isNative &&
    trade.outputAmount.currency.isToken &&
    getAddress(trade.outputAmount.currency.address) === wrappedNative
  const isWrappedToNative =
    trade.outputAmount.currency.isNative &&
    trade.inputAmount.currency.isToken &&
    getAddress(trade.inputAmount.currency.address) === wrappedNative

  if (isNativeToWrapped || isWrappedToNative) {
    const wrapTxBase = buildKasaneNativeWrapTx({
      isNativeToWrapped,
      isWrappedToNative,
      wrappedNative,
      from,
      chainId,
      amountIn,
      amountOut,
    })
    if (!wrapTxBase) {
      return {
        gasFeeResult: {
          value: undefined,
          displayValue: undefined,
          isLoading: false,
          error: new Error('Kasane wrap/unwrap requires 1:1 quote amounts'),
        },
        txRequests: undefined,
        gasEstimate: {},
        swapRequestArgs: undefined,
      }
    }

    const wrapTxRequest = await withKasaneRpcGasEstimate(wrapTxBase)
    const hasSimulationError = Boolean(wrapTxRequest.gasFeeResult.error)

    return {
      gasFeeResult: wrapTxRequest.gasFeeResult,
      txRequests: hasSimulationError ? undefined : [wrapTxRequest],
      gasEstimate: {},
      swapRequestArgs: undefined,
    }
  }

  if (hasKasaneDuplicatedPathEndpoints(path)) {
    return {
      gasFeeResult: {
        value: undefined,
        displayValue: undefined,
        isLoading: false,
        error: new Error(`Kasane swap route is invalid: duplicated path endpoints (${path[0]})`),
      },
      txRequests: undefined,
      gasEstimate: {},
      swapRequestArgs: undefined,
    }
  }

  const startsWithWrappedNative = path[0] === wrappedNative
  const endsWithWrappedNative = path[path.length - 1] === wrappedNative

  const data =
    trade.tradeType === TradeType.EXACT_INPUT
      ? startsWithWrappedNative
        ? KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapExactETHForTokens', [amountOutMin, path, to, deadline])
        : endsWithWrappedNative
          ? KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapExactTokensForETH', [amountIn, amountOutMin, path, to, deadline])
          : KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapExactTokensForTokens', [amountIn, amountOutMin, path, to, deadline])
      : startsWithWrappedNative
        ? KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapETHForExactTokens', [amountOut, path, to, deadline])
        : endsWithWrappedNative
          ? KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapTokensForExactETH', [amountOut, amountInMax, path, to, deadline])
          : KASANE_V2_ROUTER02_INTERFACE.encodeFunctionData('swapTokensForExactTokens', [amountOut, amountInMax, path, to, deadline])

  const baseTxRequest = {
    to: KASANE_V2_ROUTER02_ADDRESS,
    from,
    chainId,
    data,
    value: startsWithWrappedNative ? (trade.tradeType === TradeType.EXACT_INPUT ? amountIn : amountInMax).toString() : '0',
  }

  const allowanceWillBeGrantedInSameFlow =
    approvalAction === ApprovalAction.Permit2Approve || approvalAction === ApprovalAction.RevokeAndPermit2Approve

  // ERC20 input swaps can fail simulation before approval is mined.
  // In that case, execute approval first and let wallet estimate swap at submit-time.
  if (allowanceWillBeGrantedInSameFlow && !startsWithWrappedNative) {
    return {
      gasFeeResult: {
        value: '0',
        displayValue: '0',
        isLoading: false,
        error: null,
      },
      txRequests: [baseTxRequest],
      gasEstimate: {},
      swapRequestArgs: undefined,
    }
  }

  const txRequest = await withKasaneRpcGasEstimate(baseTxRequest)
  const hasSimulationError = Boolean(txRequest.gasFeeResult.error)

  return {
    gasFeeResult: txRequest.gasFeeResult,
    txRequests: hasSimulationError ? undefined : [txRequest],
    gasEstimate: {},
    swapRequestArgs: undefined,
  }
}

export async function withKasaneRpcGasEstimate(
  tx: {
    to: string
    from: string
    chainId: number
    data: string
    value: string
  },
): Promise<
  ({
    to: string
    from: string
    chainId: number
    data: string
    value: string
    gasLimit: string
    maxFeePerGas: string
    maxPriorityFeePerGas: string
    nonce?: number
  } & {
      gasFeeResult: TransactionRequestInfo['gasFeeResult']
    }) | {
    to: string
    from: string
    chainId: number
    data: string
    value: string
    gasFeeResult: TransactionRequestInfo['gasFeeResult']
  }
> {
  const rpcUrl = getChainInfo(UniverseChainId.Kasane).rpcUrls[RPCType.Interface].http[0]
  if (!rpcUrl) {
    throw new Error('Kasane RPC URL is not configured')
  }

  const provider = new providers.JsonRpcProvider(rpcUrl)
  const nonce = await getKasaneRpcNonceWithFallback(tx.from)

  try {
    const { maxFeePerGas, maxPriorityFeePerGas, minMaxFeePerGas, minPriorityFeePerGas } = await getKasaneRpcFeeParams(provider)
    const gasLimit = await provider.estimateGas({
      to: tx.to,
      from: tx.from,
      data: tx.data,
      value: tx.value,
    })

    const boundedMaxFeePerGas = maxFeePerGas.gte(minMaxFeePerGas) ? maxFeePerGas : minMaxFeePerGas
    const boundedPriorityFeePerGas = maxPriorityFeePerGas.gte(minPriorityFeePerGas)
      ? maxPriorityFeePerGas
      : minPriorityFeePerGas
    const gasEstimateParams = {
      gasLimit: gasLimit.toString(),
      maxFeePerGas: boundedMaxFeePerGas.toString(),
      maxPriorityFeePerGas: boundedPriorityFeePerGas.toString(),
    }
    const gasFee = boundedMaxFeePerGas.mul(gasLimit).toString()
    await provider.call(
      {
        to: tx.to,
        from: tx.from,
        data: tx.data,
        value: tx.value,
      },
      'latest',
    )
    return {
      ...tx,
      gasLimit: gasLimit.toString(),
      maxFeePerGas: boundedMaxFeePerGas.toString(),
      maxPriorityFeePerGas: boundedPriorityFeePerGas.toString(),
      nonce,
      gasFeeResult: {
        value: gasFee,
        displayValue: gasFee,
        isLoading: false,
        error: null,
        params: gasEstimateParams,
      },
    }
  } catch (error) {
    const message = extractEstimateGasFailureReason(error)
    return {
      ...tx,
      nonce,
      gasFeeResult: {
        value: undefined,
        displayValue: undefined,
        isLoading: false,
        error: new Error(`Kasane swap simulation failed: ${message}`),
        params: undefined,
      },
    }
  }
}

function extractEstimateGasFailureReason(error: unknown): string {
  const decodedReason = extractRevertReason(error)
  if (decodedReason) {
    return decodedReason
  }

  const messageCandidates = [
    getErrorMessage(error),
    getNestedErrorMessage(error, 'error'),
    getNestedErrorMessage(error, 'cause'),
    getNestedErrorMessage(error, 'data'),
    getMessageFromJsonRpcBody(error),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of messageCandidates) {
    const decoded = decodeRevertMessage(candidate)
    if (decoded) {
      return decoded
    }
  }

  return messageCandidates[0] ?? 'unknown estimateGas error'
}

export function extractRevertReason(error: unknown): string | undefined {
  const rawDataCandidates = [getNestedHexData(error, 'data'), getNestedHexData(error, 'error'), getNestedHexData(error, 'cause')].filter(
    (candidate): candidate is string => Boolean(candidate),
  )

  for (const rawData of rawDataCandidates) {
    const decoded = decodeRevertMessage(rawData)
    if (decoded) {
      return decoded
    }
  }

  const messageCandidates = [
    getErrorMessage(error),
    getNestedErrorMessage(error, 'error'),
    getNestedErrorMessage(error, 'cause'),
    getNestedErrorMessage(error, 'data'),
    getMessageFromJsonRpcBody(error),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of messageCandidates) {
    const decoded = decodeRevertMessage(candidate)
    if (decoded) {
      return decoded
    }
  }

  return undefined
}

function decodeRevertMessage(message: string): string | undefined {
  const revertedPrefix = 'execution reverted:'
  const loweredMessage = message.toLowerCase()
  const revertedIndex = loweredMessage.indexOf(revertedPrefix)
  if (revertedIndex >= 0) {
    const reason = message.slice(revertedIndex + revertedPrefix.length).trim()
    if (reason) {
      return reason
    }
  }

  const hexData = extractHexData(message)
  if (!hexData) {
    return undefined
  }

  const selector = hexData.slice(0, 10).toLowerCase()
  if (selector === '0x08c379a0') {
    try {
      const payload = `0x${hexData.slice(10)}`
      const [reason] = defaultAbiCoder.decode(['string'], payload)
      if (typeof reason === 'string' && reason.length > 0) {
        return reason
      }
    } catch {
      return message
    }
  }

  if (selector === '0x4e487b71') {
    try {
      const payload = `0x${hexData.slice(10)}`
      const [panicCode] = defaultAbiCoder.decode(['uint256'], payload)
      return `panic code ${String(panicCode)}`
    } catch {
      return message
    }
  }

  return undefined
}

function extractHexData(message: string): string | undefined {
  const hexMatches = message.match(/0x[0-9a-fA-F]{8,}/g)
  if (!hexMatches || hexMatches.length === 0) {
    return undefined
  }

  return hexMatches[hexMatches.length - 1]
}

function getNestedHexData(error: unknown, key: string): string | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  const value = error[key]
  if (typeof value === 'string') {
    return extractHexData(value)
  }

  if (isRecord(value)) {
    const message = getErrorMessage(value)
    if (message) {
      return extractHexData(message)
    }

    const nestedBody = getMessageFromJsonRpcBody(value)
    if (nestedBody) {
      return extractHexData(nestedBody)
    }
  }

  return undefined
}

function getMessageFromJsonRpcBody(error: unknown): string | undefined {
  const body = getStringField(error, 'body')
  if (!body) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(body)
    if (!isRecord(parsed)) {
      return undefined
    }

    const parsedError = parsed.error
    if (!isRecord(parsedError)) {
      return undefined
    }

    const message = parsedError.message
    return typeof message === 'string' ? message : undefined
  } catch {
    return undefined
  }
}

function getNestedErrorMessage(error: unknown, key: string): string | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  return getErrorMessage(error[key])
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message
  }

  if (!isRecord(error)) {
    return undefined
  }

  const message = error.message
  return typeof message === 'string' ? message : undefined
}

function getStringField(error: unknown, key: string): string | undefined {
  if (!isRecord(error)) {
    return undefined
  }

  const value = error[key]
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getKasaneRpcNonceWithFallback(address: string): Promise<number | undefined> {
  const rpcUrl = getChainInfo(UniverseChainId.Kasane).rpcUrls[RPCType.Interface].http[0]
  if (!rpcUrl) {
    return undefined
  }
  try {
    const provider = new providers.JsonRpcProvider(rpcUrl)
    return await getKasaneRpcNonce(provider, address)
  } catch {
    return undefined
  }
}

async function getKasaneRpcFeeParams(provider: providers.JsonRpcProvider): Promise<{
  maxFeePerGas: BigNumber
  maxPriorityFeePerGas: BigNumber
  minMaxFeePerGas: BigNumber
  minPriorityFeePerGas: BigNumber
}> {
  const minMaxFeePerGas = parseUnits(KASANE_MIN_MAX_FEE_PER_GAS_GWEI, 'gwei')
  const minPriorityFeePerGas = parseUnits(KASANE_MIN_MAX_PRIORITY_FEE_PER_GAS_GWEI, 'gwei')

  try {
    const [priorityFeeRaw, feeHistoryRaw] = await Promise.all([
      provider.send('eth_maxPriorityFeePerGas', []),
      provider.send('eth_feeHistory', ['0x1', 'latest', [50]]),
    ])

    const priorityFee = BigNumber.from(priorityFeeRaw)
    const baseFeeHistory = feeHistoryRaw?.baseFeePerGas
    const latestBaseFeeRaw =
      Array.isArray(baseFeeHistory) && baseFeeHistory.length > 0 ? baseFeeHistory[baseFeeHistory.length - 1] : undefined
    const latestBaseFee = latestBaseFeeRaw ? BigNumber.from(latestBaseFeeRaw) : BigNumber.from(0)

    const computedMaxFee = latestBaseFee.mul(2).add(priorityFee)
    return {
      maxFeePerGas: computedMaxFee.gte(minMaxFeePerGas) ? computedMaxFee : minMaxFeePerGas,
      maxPriorityFeePerGas: priorityFee.gte(minPriorityFeePerGas) ? priorityFee : minPriorityFeePerGas,
      minMaxFeePerGas,
      minPriorityFeePerGas,
    }
  } catch {
    throw new Error('Kasane RPC fee params require eth_maxPriorityFeePerGas and eth_feeHistory')
  }
}

async function getKasaneRpcNonce(provider: providers.JsonRpcProvider, address: string): Promise<number> {
  const blockTags: Array<'pending' | 'latest' | 'safe'> = ['pending', 'latest', 'safe']
  let lastError: unknown

  for (const blockTag of blockTags) {
    try {
      const nonce = await provider.send('eth_getTransactionCount', [address, blockTag])
      if (typeof nonce !== 'string') {
        continue
      }
      return BigNumber.from(nonce).toNumber()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('Failed to fetch nonce for Kasane swap transaction')
}

function getSlippageBps(slippageTolerancePercent: number): bigint {
  const normalized = Number.isFinite(slippageTolerancePercent) ? slippageTolerancePercent : 0
  const bps = Math.max(0, Math.round(normalized * 100))
  return BigInt(bps)
}

function applyNegativeSlippage(amount: bigint, bps: bigint): bigint {
  const denominator = BigInt(10_000)
  const multiplier = denominator - bps
  return (amount * multiplier) / denominator
}

function applyPositiveSlippage(amount: bigint, bps: bigint): bigint {
  const denominator = BigInt(10_000)
  const multiplier = denominator + bps
  return (amount * multiplier + denominator - BigInt(1)) / denominator
}
