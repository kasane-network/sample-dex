/* eslint-disable max-lines */
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { Pool as V3Pool } from '@uniswap/v3-sdk'
import { Pool as V4Pool } from '@uniswap/v4-sdk'
import { TradingApi } from '@universe/api'
import { useDepositInfo } from 'components/Liquidity/Create/hooks/useDepositInfo'
import { DYNAMIC_FEE_DATA, PositionState } from 'components/Liquidity/Create/types'
import { useCreatePositionDependentAmountFallback } from 'components/Liquidity/hooks/useDependentAmountFallback'
import { getTokenOrZeroAddress, validateCurrencyInput } from 'components/Liquidity/utils/currency'
import { isInvalidRange, isOutOfRange } from 'components/Liquidity/utils/priceRangeInfo'
import { getProtocolItems } from 'components/Liquidity/utils/protocolVersion'
import { useCreateLiquidityContext } from 'pages/CreatePosition/CreateLiquidityContextProvider'
import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { PositionField } from 'types/position'
import { useUniswapContextSelector } from 'uniswap/src/contexts/UniswapContext'
import { DEFAULT_CUSTOM_DEADLINE } from 'uniswap/src/constants/transactions'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { useCheckLpApprovalQuery } from 'uniswap/src/data/apiClients/tradingApi/useCheckLpApprovalQuery'
import { useCreateLpPositionCalldataQuery } from 'uniswap/src/data/apiClients/tradingApi/useCreateLpPositionCalldataQuery'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toSupportedChainId } from 'uniswap/src/features/chains/utils'
import { useTransactionGasFee, useUSDCurrencyAmountOfGasFee } from 'uniswap/src/features/gas/hooks'
import { InterfaceEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { useTransactionSettingsStore } from 'uniswap/src/features/transactions/components/settings/stores/transactionSettingsStore/useTransactionSettingsStore'
import { CreatePositionTxAndGasInfo, LiquidityTransactionType } from 'uniswap/src/features/transactions/liquidity/types'
import { getErrorMessageToDisplay, parseErrorMessageTitle } from 'uniswap/src/features/transactions/liquidity/utils'
import { TransactionStepType } from 'uniswap/src/features/transactions/steps/types'
import { PermitMethod } from 'uniswap/src/features/transactions/swap/types/swapTxAndGasInfo'
import { validatePermit, validateTransactionRequest } from 'uniswap/src/features/transactions/swap/utils/trade'
import { useWallet } from 'uniswap/src/features/wallet/hooks/useWallet'
import { AccountDetails } from 'uniswap/src/features/wallet/types/AccountDetails'
import { logger } from 'utilities/src/logger/logger'
import { ONE_SECOND_MS } from 'utilities/src/time/time'
import { getAddress, Interface } from 'ethers/lib/utils'

const KASANE_V2_ROUTER02_ADDRESS = '0xe5455e558b8701a32b12f8881ff72a35d771b672'
const MAX_UINT256_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

const ERC20_INTERFACE = new Interface(['function approve(address spender, uint256 value) returns (bool)'])
const V2_ROUTER02_INTERFACE = new Interface([
  'function addLiquidity(address tokenA,address tokenB,uint amountADesired,uint amountBDesired,uint amountAMin,uint amountBMin,address to,uint deadline)',
  'function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable',
])

function getSlippageBps(slippageTolerancePercent?: number): bigint {
  const percent = slippageTolerancePercent ?? 0.5
  const bps = Math.floor(percent * 100)
  const clamped = Math.max(0, Math.min(10_000, bps))
  return BigInt(clamped)
}

function applySlippageDown(amount: bigint, bps: bigint): bigint {
  return (amount * (10_000n - bps)) / 10_000n
}

function buildLocalV2CreateTxInfo({
  accountAddress,
  chainId,
  token0,
  token1,
  amount0,
  amount1,
  customSlippageTolerance,
  customDeadline,
  canBatchTransactions,
  liquidityToken,
}: {
  accountAddress?: string
  chainId?: number
  token0?: Currency
  token1?: Currency
  amount0?: CurrencyAmount<Currency>
  amount1?: CurrencyAmount<Currency>
  customSlippageTolerance?: number
  customDeadline?: number
  canBatchTransactions: boolean
  liquidityToken?: Pair['liquidityToken']
}): CreatePositionTxAndGasInfo | undefined {
  if (!accountAddress || !chainId || !token0 || !token1 || !amount0 || !amount1) {
    return undefined
  }

  if (chainId !== UniverseChainId.Kasane) {
    return undefined
  }

  if (token0.isNative && token1.isNative) {
    return undefined
  }

  const routerAddress = getAddress(KASANE_V2_ROUTER02_ADDRESS)
  const recipient = getAddress(accountAddress)
  const slippageBps = getSlippageBps(customSlippageTolerance)
  const deadlineSeconds = Math.floor(Date.now() / 1000) + (customDeadline ?? DEFAULT_CUSTOM_DEADLINE) * 60

  const amount0Raw = BigInt(amount0.quotient.toString())
  const amount1Raw = BigInt(amount1.quotient.toString())
  const amount0MinRaw = applySlippageDown(amount0Raw, slippageBps)
  const amount1MinRaw = applySlippageDown(amount1Raw, slippageBps)

  let txData: string
  let txValue: string
  let approveToken0Request:
    | ReturnType<typeof validateTransactionRequest>
    | undefined
  let approveToken1Request:
    | ReturnType<typeof validateTransactionRequest>
    | undefined

  if (token0.isNative || token1.isNative) {
    const token = token0.isNative ? token1 : token0
    const tokenAmountDesired = token0.isNative ? amount1Raw : amount0Raw
    const tokenAmountMin = token0.isNative ? amount1MinRaw : amount0MinRaw
    const nativeAmountDesired = token0.isNative ? amount0Raw : amount1Raw
    const nativeAmountMin = token0.isNative ? amount0MinRaw : amount1MinRaw

    txData = V2_ROUTER02_INTERFACE.encodeFunctionData('addLiquidityETH', [
      getAddress(token.wrapped.address),
      tokenAmountDesired.toString(),
      tokenAmountMin.toString(),
      nativeAmountMin.toString(),
      recipient,
      deadlineSeconds,
    ])
    txValue = nativeAmountDesired.toString()

    const approveTokenRequest = validateTransactionRequest({
      chainId,
      from: recipient,
      to: getAddress(token.wrapped.address),
      data: ERC20_INTERFACE.encodeFunctionData('approve', [routerAddress, MAX_UINT256_HEX]),
      value: '0',
    })

    if (token0.isNative) {
      approveToken1Request = approveTokenRequest
    } else {
      approveToken0Request = approveTokenRequest
    }
  } else {
    txData = V2_ROUTER02_INTERFACE.encodeFunctionData('addLiquidity', [
      getAddress(token0.wrapped.address),
      getAddress(token1.wrapped.address),
      amount0Raw.toString(),
      amount1Raw.toString(),
      amount0MinRaw.toString(),
      amount1MinRaw.toString(),
      recipient,
      deadlineSeconds,
    ])
    txValue = '0'

    approveToken0Request = validateTransactionRequest({
      chainId,
      from: recipient,
      to: getAddress(token0.wrapped.address),
      data: ERC20_INTERFACE.encodeFunctionData('approve', [routerAddress, MAX_UINT256_HEX]),
      value: '0',
    })
    approveToken1Request = validateTransactionRequest({
      chainId,
      from: recipient,
      to: getAddress(token1.wrapped.address),
      data: ERC20_INTERFACE.encodeFunctionData('approve', [routerAddress, MAX_UINT256_HEX]),
      value: '0',
    })
  }

  const txRequest = validateTransactionRequest({
    chainId,
    from: recipient,
    to: routerAddress,
    data: txData,
    value: txValue,
  })

  if (!txRequest) {
    return undefined
  }

  return {
    type: LiquidityTransactionType.Create,
    canBatchTransactions,
    unsigned: false,
    createPositionRequestArgs: undefined,
    action: {
      type: LiquidityTransactionType.Create,
      currency0Amount: amount0,
      currency1Amount: amount1,
      liquidityToken,
    },
    approveToken0Request,
    approveToken1Request,
    txRequest,
    approvePositionTokenRequest: undefined,
    revokeToken0Request: undefined,
    revokeToken1Request: undefined,
    permit: undefined,
    token0PermitTransaction: undefined,
    token1PermitTransaction: undefined,
    positionTokenPermitTransaction: undefined,
    sqrtRatioX96: undefined,
  } satisfies CreatePositionTxAndGasInfo
}

/**
 * @internal - exported for testing
 */
export function generateAddLiquidityApprovalParams({
  address,
  protocolVersion,
  displayCurrencies,
  currencyAmounts,
  canBatchTransactions,
}: {
  address?: string
  protocolVersion: ProtocolVersion
  displayCurrencies: { [field in PositionField]: Maybe<Currency> }
  currencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  canBatchTransactions?: boolean
}): TradingApi.CheckApprovalLPRequest | undefined {
  const apiProtocolItems = getProtocolItems(protocolVersion)

  if (
    !address ||
    !apiProtocolItems ||
    !currencyAmounts?.TOKEN0 ||
    !currencyAmounts.TOKEN1 ||
    !validateCurrencyInput(displayCurrencies)
  ) {
    return undefined
  }

  return {
    simulateTransaction: true,
    walletAddress: address,
    chainId: currencyAmounts.TOKEN0.currency.chainId,
    protocol: apiProtocolItems,
    token0: getTokenOrZeroAddress(displayCurrencies.TOKEN0),
    token1: getTokenOrZeroAddress(displayCurrencies.TOKEN1),
    amount0: currencyAmounts.TOKEN0.quotient.toString(),
    amount1: currencyAmounts.TOKEN1.quotient.toString(),
    generatePermitAsTransaction: protocolVersion === ProtocolVersion.V4 ? canBatchTransactions : undefined,
  } satisfies TradingApi.CheckApprovalLPRequest
}

/**
 * @internal - exported for testing
 */
export function generateCreateCalldataQueryParams({
  protocolVersion,
  creatingPoolOrPair,
  account,
  approvalCalldata,
  positionState,
  ticks,
  poolOrPair,
  displayCurrencies,
  currencyAmounts,
  independentField,
  slippageTolerance,
}: {
  protocolVersion: ProtocolVersion
  creatingPoolOrPair: boolean | undefined
  account?: AccountDetails
  approvalCalldata?: TradingApi.CheckApprovalLPResponse
  positionState: PositionState
  ticks: [Maybe<number>, Maybe<number>]
  poolOrPair: V3Pool | V4Pool | Pair | undefined
  displayCurrencies: { [field in PositionField]: Maybe<Currency> }
  currencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  independentField: PositionField
  slippageTolerance?: number
}): TradingApi.CreateLPPositionRequest | undefined {
  const apiProtocolItems = getProtocolItems(protocolVersion)

  if (
    !account?.address ||
    !apiProtocolItems ||
    !currencyAmounts?.TOKEN0 ||
    !currencyAmounts.TOKEN1 ||
    !validateCurrencyInput(displayCurrencies)
  ) {
    return undefined
  }

  const {
    token0Approval,
    token1Approval,
    positionTokenApproval,
    permitData,
    token0PermitTransaction,
    token1PermitTransaction,
  } = approvalCalldata ?? {}

  if (protocolVersion === ProtocolVersion.V2) {
    if (protocolVersion !== positionState.protocolVersion) {
      return undefined
    }

    const pair = poolOrPair

    if (!pair || !displayCurrencies.TOKEN0 || !displayCurrencies.TOKEN1) {
      return undefined
    }

    const independentToken =
      independentField === PositionField.TOKEN0
        ? TradingApi.IndependentToken.TOKEN_0
        : TradingApi.IndependentToken.TOKEN_1
    const dependentField = independentField === PositionField.TOKEN0 ? PositionField.TOKEN1 : PositionField.TOKEN0
    const independentAmount = currencyAmounts[independentField]
    const dependentAmount = currencyAmounts[dependentField]

    return {
      simulateTransaction: !(
        permitData ||
        token0PermitTransaction ||
        token1PermitTransaction ||
        token0Approval ||
        token1Approval ||
        positionTokenApproval
      ),
      protocol: apiProtocolItems,
      walletAddress: account.address,
      chainId: currencyAmounts.TOKEN0.currency.chainId,
      independentAmount: independentAmount?.quotient.toString(),
      independentToken,
      defaultDependentAmount: dependentAmount?.quotient.toString(),
      slippageTolerance,
      position: {
        pool: {
          token0: getTokenOrZeroAddress(displayCurrencies.TOKEN0),
          token1: getTokenOrZeroAddress(displayCurrencies.TOKEN1),
        },
      },
    } satisfies TradingApi.CreateLPPositionRequest
  }

  if (protocolVersion !== positionState.protocolVersion) {
    return undefined
  }

  const pool = poolOrPair as V4Pool | V3Pool | undefined
  if (!pool || !displayCurrencies.TOKEN0 || !displayCurrencies.TOKEN1) {
    return undefined
  }

  const tickLower = ticks[0]
  const tickUpper = ticks[1]

  if (tickLower === undefined || tickUpper === undefined) {
    return undefined
  }

  const initialPrice = creatingPoolOrPair ? pool.sqrtRatioX96.toString() : undefined
  const tickSpacing = pool.tickSpacing

  const independentToken =
    independentField === PositionField.TOKEN0
      ? TradingApi.IndependentToken.TOKEN_0
      : TradingApi.IndependentToken.TOKEN_1
  const dependentField = independentField === PositionField.TOKEN0 ? PositionField.TOKEN1 : PositionField.TOKEN0
  const independentAmount = currencyAmounts[independentField]
  const dependentAmount = currencyAmounts[dependentField]

  return {
    simulateTransaction: !(
      permitData ||
      token0PermitTransaction ||
      token1PermitTransaction ||
      token0Approval ||
      token1Approval ||
      positionTokenApproval
    ),
    protocol: apiProtocolItems,
    walletAddress: account.address,
    chainId: currencyAmounts.TOKEN0.currency.chainId,
    independentAmount: independentAmount?.quotient.toString(),
    independentToken,
    initialDependentAmount: initialPrice && dependentAmount?.quotient.toString(), // only set this if there is an initialPrice
    initialPrice,
    slippageTolerance,
    position: {
      tickLower: tickLower ?? undefined,
      tickUpper: tickUpper ?? undefined,
      pool: {
        tickSpacing,
        token0: getTokenOrZeroAddress(displayCurrencies.TOKEN0),
        token1: getTokenOrZeroAddress(displayCurrencies.TOKEN1),
        fee: positionState.fee?.isDynamic ? DYNAMIC_FEE_DATA.feeAmount : positionState.fee?.feeAmount,
        hooks: positionState.hook,
      },
    },
  } satisfies TradingApi.CreateLPPositionRequest
}

/**
 * @internal - exported for testing
 */
export function generateCreatePositionTxRequest({
  protocolVersion,
  approvalCalldata,
  createCalldata,
  createCalldataQueryParams,
  currencyAmounts,
  poolOrPair,
  canBatchTransactions,
}: {
  protocolVersion: ProtocolVersion
  approvalCalldata?: TradingApi.CheckApprovalLPResponse
  createCalldata?: TradingApi.CreateLPPositionResponse
  createCalldataQueryParams?: TradingApi.CreateLPPositionRequest
  currencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  poolOrPair: Pair | undefined
  canBatchTransactions: boolean
}): CreatePositionTxAndGasInfo | undefined {
  if (!createCalldata || !currencyAmounts?.TOKEN0 || !currencyAmounts.TOKEN1) {
    return undefined
  }

  const validatedApprove0Request = validateTransactionRequest(approvalCalldata?.token0Approval)
  if (approvalCalldata?.token0Approval && !validatedApprove0Request) {
    return undefined
  }

  const validatedApprove1Request = validateTransactionRequest(approvalCalldata?.token1Approval)
  if (approvalCalldata?.token1Approval && !validatedApprove1Request) {
    return undefined
  }

  const validatedRevoke0Request = validateTransactionRequest(approvalCalldata?.token0Cancel)
  if (approvalCalldata?.token0Cancel && !validatedRevoke0Request) {
    return undefined
  }

  const validatedRevoke1Request = validateTransactionRequest(approvalCalldata?.token1Cancel)
  if (approvalCalldata?.token1Cancel && !validatedRevoke1Request) {
    return undefined
  }

  const validatedPermitRequest = validatePermit(approvalCalldata?.permitData)
  if (approvalCalldata?.permitData && !validatedPermitRequest) {
    return undefined
  }

  const validatedToken0PermitTransaction = validateTransactionRequest(approvalCalldata?.token0PermitTransaction)
  const validatedToken1PermitTransaction = validateTransactionRequest(approvalCalldata?.token1PermitTransaction)

  const txRequest = validateTransactionRequest(createCalldata.create)
  if (!txRequest && !(validatedToken0PermitTransaction || validatedToken1PermitTransaction)) {
    // Allow missing txRequest if mismatched (unsigned flow using token0PermitTransaction/2)
    return undefined
  }

  const queryParams: TradingApi.CreateLPPositionRequest | undefined =
    protocolVersion === ProtocolVersion.V4
      ? { ...createCalldataQueryParams, batchPermitData: validatedPermitRequest }
      : createCalldataQueryParams

  return {
    type: LiquidityTransactionType.Create,
    canBatchTransactions,
    unsigned: Boolean(validatedPermitRequest),
    createPositionRequestArgs: queryParams,
    action: {
      type: LiquidityTransactionType.Create,
      currency0Amount: currencyAmounts.TOKEN0,
      currency1Amount: currencyAmounts.TOKEN1,
      liquidityToken: protocolVersion === ProtocolVersion.V2 ? poolOrPair?.liquidityToken : undefined,
    },
    approveToken0Request: validatedApprove0Request,
    approveToken1Request: validatedApprove1Request,
    txRequest,
    approvePositionTokenRequest: undefined,
    revokeToken0Request: validatedRevoke0Request,
    revokeToken1Request: validatedRevoke1Request,
    permit: validatedPermitRequest ? { method: PermitMethod.TypedData, typedData: validatedPermitRequest } : undefined,
    token0PermitTransaction: validatedToken0PermitTransaction,
    token1PermitTransaction: validatedToken1PermitTransaction,
    positionTokenPermitTransaction: undefined,
    sqrtRatioX96: createCalldata.sqrtRatioX96,
  } satisfies CreatePositionTxAndGasInfo
}

interface CreatePositionTxContextType {
  txInfo?: CreatePositionTxAndGasInfo
  gasFeeEstimateUSD?: Maybe<CurrencyAmount<Currency>>
  transactionError: boolean | string
  setTransactionError: Dispatch<SetStateAction<string | boolean>>
  dependentAmount?: string
  currencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  inputError?: ReactNode
  formattedAmounts?: { [field in PositionField]?: string }
  currencyAmountsUSDValue?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  currencyBalances?: { [field in PositionField]?: CurrencyAmount<Currency> }
}

const CreatePositionTxContext = createContext<CreatePositionTxContextType | undefined>(undefined)

export function CreatePositionTxContextProvider({ children }: PropsWithChildren): JSX.Element {
  const {
    protocolVersion,
    currencies,
    ticks,
    poolOrPair,
    depositState,
    creatingPoolOrPair,
    currentTransactionStep,
    positionState,
    setRefetch,
  } = useCreateLiquidityContext()
  const account = useWallet().evmAccount
  const { TOKEN0, TOKEN1 } = currencies.display
  const { exactField } = depositState

  const invalidRange = protocolVersion !== ProtocolVersion.V2 && isInvalidRange(ticks[0], ticks[1])
  const depositInfoProps = useMemo(() => {
    const [tickLower, tickUpper] = ticks
    const outOfRange = isOutOfRange({
      poolOrPair,
      lowerTick: tickLower,
      upperTick: tickUpper,
    })

    return {
      protocolVersion,
      poolOrPair,
      address: account?.address,
      token0: TOKEN0,
      token1: TOKEN1,
      tickLower: protocolVersion !== ProtocolVersion.V2 ? (tickLower ?? undefined) : undefined,
      tickUpper: protocolVersion !== ProtocolVersion.V2 ? (tickUpper ?? undefined) : undefined,
      exactField,
      exactAmounts: depositState.exactAmounts,
      skipDependentAmount: protocolVersion === ProtocolVersion.V2 ? false : outOfRange || invalidRange,
    }
  }, [TOKEN0, TOKEN1, exactField, ticks, poolOrPair, depositState, account?.address, protocolVersion, invalidRange])

  const {
    currencyAmounts,
    error: inputError,
    formattedAmounts,
    currencyAmountsUSDValue,
    currencyBalances,
  } = useDepositInfo(depositInfoProps)

  const { customDeadline, customSlippageTolerance } = useTransactionSettingsStore((s) => ({
    customDeadline: s.customDeadline,
    customSlippageTolerance: s.customSlippageTolerance,
  }))
  const canBatchTransactions =
    (useUniswapContextSelector((ctx) => ctx.getCanBatchTransactions?.(poolOrPair?.chainId)) ?? false) &&
    poolOrPair?.chainId !== UniverseChainId.Monad
  const isTradingApiDisabled = uniswapUrls.tradingApiUrl.startsWith('/__disabled_api__')
  const canUseTradingApi = false

  const [transactionError, setTransactionError] = useState<string | boolean>(false)

  // 入力不足/入力エラー時は、過去のAPI失敗メッセージを残さない。
  // これにより、ユーザーには「入力を埋める」ことだけが明確に見える。
  useEffect(() => {
    if (inputError) {
      setTransactionError(false)
    }
  }, [inputError])

  const addLiquidityApprovalParams = useMemo(() => {
    return generateAddLiquidityApprovalParams({
      address: account?.address,
      protocolVersion,
      displayCurrencies: currencies.display,
      currencyAmounts,
      canBatchTransactions,
    })
  }, [account?.address, protocolVersion, currencies.display, currencyAmounts, canBatchTransactions])

  const {
    data: approvalCalldata,
    error: approvalError,
    isLoading: approvalLoading,
    refetch: approvalRefetch,
  } = useCheckLpApprovalQuery({
    params: addLiquidityApprovalParams,
    staleTime: 5 * ONE_SECOND_MS,
    retry: false,
    enabled: canUseTradingApi && !!addLiquidityApprovalParams && !inputError && !transactionError && !invalidRange,
  })

  if (approvalError) {
    const message = parseErrorMessageTitle(approvalError, { defaultTitle: 'unknown CheckLpApprovalQuery' })
    logger.error(message, {
      tags: { file: 'CreatePositionTxContext', function: 'useEffect' },
    })
    if (import.meta.env.DEV) {
      console.error('[LP_DEBUG][CreatePositionTxContext][approvalError]', {
        message,
        isTradingApiDisabled,
        params: addLiquidityApprovalParams,
        error: approvalError,
      })
    }
  }

  const gasFeeToken0USD = useUSDCurrencyAmountOfGasFee(poolOrPair?.chainId, approvalCalldata?.gasFeeToken0Approval)
  const gasFeeToken1USD = useUSDCurrencyAmountOfGasFee(poolOrPair?.chainId, approvalCalldata?.gasFeeToken1Approval)
  const gasFeeToken0PermitUSD = useUSDCurrencyAmountOfGasFee(poolOrPair?.chainId, approvalCalldata?.gasFeeToken0Permit)
  const gasFeeToken1PermitUSD = useUSDCurrencyAmountOfGasFee(poolOrPair?.chainId, approvalCalldata?.gasFeeToken1Permit)

  const createCalldataQueryParams = useMemo(() => {
    return generateCreateCalldataQueryParams({
      account,
      approvalCalldata,
      positionState,
      protocolVersion,
      creatingPoolOrPair,
      displayCurrencies: currencies.display,
      ticks,
      poolOrPair,
      currencyAmounts,
      independentField: depositState.exactField,
      slippageTolerance: customSlippageTolerance,
    })
  }, [
    account,
    approvalCalldata,
    currencyAmounts,
    creatingPoolOrPair,
    ticks,
    poolOrPair,
    positionState,
    depositState.exactField,
    customSlippageTolerance,
    currencies.display,
    protocolVersion,
  ])

  const isUserCommittedToCreate =
    currentTransactionStep?.step.type === TransactionStepType.IncreasePositionTransaction ||
    currentTransactionStep?.step.type === TransactionStepType.IncreasePositionTransactionAsync

  const isQueryEnabled =
    canUseTradingApi &&
    !isUserCommittedToCreate &&
    !inputError &&
    !transactionError &&
    !approvalLoading &&
    !approvalError &&
    !invalidRange &&
    Boolean(approvalCalldata) &&
    Boolean(createCalldataQueryParams)

  const {
    data: createCalldata,
    error: createError,
    refetch: createRefetch,
  } = useCreateLpPositionCalldataQuery({
    params: createCalldataQueryParams,
    deadlineInMinutes: customDeadline,
    refetchInterval: transactionError ? false : 5 * ONE_SECOND_MS,
    retry: false,
    enabled: isQueryEnabled,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: +createCalldataQueryParams, +addLiquidityApprovalParams
  useEffect(() => {
    setRefetch(() => (approvalError ? approvalRefetch : createError ? createRefetch : undefined)) // this must set it as a function otherwise it will actually call createRefetch immediately
  }, [
    approvalError,
    createError,
    createCalldataQueryParams,
    addLiquidityApprovalParams,
    setTransactionError,
    setRefetch,
    createRefetch,
    approvalRefetch,
  ])

  useEffect(() => {
    if (!canUseTradingApi) {
      setTransactionError(false)
      return
    }
    setTransactionError(getErrorMessageToDisplay({ approvalError, calldataError: createError }))
  }, [canUseTradingApi, approvalError, createError])

  if (createError) {
    const message = parseErrorMessageTitle(createError, { defaultTitle: 'unknown CreateLpPositionCalldataQuery' })
    logger.error(message, {
      tags: { file: 'CreatePositionTxContext', function: 'useEffect' },
    })
    if (import.meta.env.DEV) {
      console.error('[LP_DEBUG][CreatePositionTxContext][createError]', {
        message,
        isTradingApiDisabled,
        params: createCalldataQueryParams,
        error: createError,
      })
    }

    if (createCalldataQueryParams) {
      sendAnalyticsEvent(InterfaceEventName.CreatePositionFailed, {
        message,
        ...createCalldataQueryParams,
      })
    }
  }

  const dependentAmountFallback = useCreatePositionDependentAmountFallback(
    createCalldataQueryParams,
    isQueryEnabled && Boolean(createError),
  )

  const actualGasFee = createCalldata?.gasFee
  const needsApprovals = !!(
    approvalCalldata?.token0Approval ||
    approvalCalldata?.token1Approval ||
    approvalCalldata?.token0Cancel ||
    approvalCalldata?.token1Cancel ||
    approvalCalldata?.token0PermitTransaction ||
    approvalCalldata?.token1PermitTransaction
  )
  const { value: calculatedGasFee } = useTransactionGasFee({
    tx: createCalldata?.create,
    skip: !!actualGasFee || needsApprovals,
  })
  const increaseGasFeeUsd = useUSDCurrencyAmountOfGasFee(
    toSupportedChainId(createCalldata?.create?.chainId) ?? undefined,
    actualGasFee || calculatedGasFee,
  )

  const totalGasFee = useMemo(() => {
    const fees = [gasFeeToken0USD, gasFeeToken1USD, increaseGasFeeUsd, gasFeeToken0PermitUSD, gasFeeToken1PermitUSD]
    return fees.reduce((total, fee) => {
      if (fee && total) {
        return total.add(fee)
      }
      return total || fee
    })
  }, [gasFeeToken0USD, gasFeeToken1USD, increaseGasFeeUsd, gasFeeToken0PermitUSD, gasFeeToken1PermitUSD])

  const localV2TxInfo = useMemo(() => {
    if (protocolVersion !== ProtocolVersion.V2) {
      return undefined
    }

    return buildLocalV2CreateTxInfo({
      accountAddress: account?.address,
      chainId: poolOrPair?.chainId ?? currencyAmounts?.TOKEN0?.currency.chainId,
      token0: currencies.display.TOKEN0 ?? undefined,
      token1: currencies.display.TOKEN1 ?? undefined,
      amount0: currencyAmounts?.TOKEN0 ?? undefined,
      amount1: currencyAmounts?.TOKEN1 ?? undefined,
      customSlippageTolerance,
      customDeadline,
      canBatchTransactions,
      liquidityToken: (poolOrPair as Pair | undefined)?.liquidityToken,
    })
  }, [
    account?.address,
    canBatchTransactions,
    canUseTradingApi,
    currencies.display.TOKEN0,
    currencies.display.TOKEN1,
    currencyAmounts?.TOKEN0,
    currencyAmounts?.TOKEN1,
    customDeadline,
    customSlippageTolerance,
    poolOrPair?.chainId,
    (poolOrPair as Pair | undefined)?.liquidityToken,
    protocolVersion,
  ])

  const txInfo = useMemo(() => {
    return localV2TxInfo
  }, [
    localV2TxInfo,
  ])

  const value = useMemo(
    (): CreatePositionTxContextType => ({
      txInfo,
      gasFeeEstimateUSD: totalGasFee,
      transactionError,
      setTransactionError,
      // V2はRPCで取得したペアのリザーブ比から依存額を算出するため、
      // APIレスポンスのdependentAmountでUI入力を上書きしない。
      dependentAmount: undefined,
      currencyAmounts,
      inputError,
      formattedAmounts,
      currencyAmountsUSDValue,
      currencyBalances,
    }),
    [
      txInfo,
      totalGasFee,
      transactionError,
      currencyAmounts,
      inputError,
      formattedAmounts,
      currencyAmountsUSDValue,
      currencyBalances,
    ],
  )

  return <CreatePositionTxContext.Provider value={value}>{children}</CreatePositionTxContext.Provider>
}

export const useCreatePositionTxContext = (): CreatePositionTxContextType => {
  const context = useContext(CreatePositionTxContext)

  if (!context) {
    throw new Error('`useCreatePositionTxContext` must be used inside of `CreatePositionTxContextProvider`')
  }

  return context
}
