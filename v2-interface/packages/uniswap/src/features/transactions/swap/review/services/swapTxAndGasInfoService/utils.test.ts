import { CurrencyAmount } from '@uniswap/sdk-core'
import type { ClassicQuoteResponse } from '@universe/api'
import { FeeType, TradingApi } from '@universe/api'
import { BigNumber, providers } from 'ethers'
import { DAI, USDC } from 'uniswap/src/constants/tokens'
import type { GasFeeResult } from 'uniswap/src/features/gas/types'
import { DEFAULT_GAS_STRATEGY } from 'uniswap/src/features/gas/utils'
import type { TransactionSettingsState } from 'uniswap/src/features/transactions/components/settings/types'
import { UnknownSimulationError } from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/constants'
import type { SwapData } from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/evm/evmSwapRepository'
import {
  buildKasaneNativeWrapTx,
  extractRevertReason,
  hasKasaneDuplicatedPathEndpoints,
  withKasaneRpcGasEstimate,
} from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/evm/utils'
import {
  createPrepareSwapRequestParams,
  createProcessSwapResponse,
  getShouldSkipSwapRequest,
  getSimulationError,
  processWrapResponse,
} from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/utils'
import type { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import type { TokenApprovalInfo, TradeWithStatus } from 'uniswap/src/features/transactions/swap/types/trade'
import { ApprovalAction } from 'uniswap/src/features/transactions/swap/types/trade'
import { DEFAULT_PROTOCOL_OPTIONS } from 'uniswap/src/features/transactions/swap/utils/protocols'
import { WrapType } from 'uniswap/src/features/transactions/types/wrap'
import { CurrencyField } from 'uniswap/src/types/currency'

const mockPermitData = { fakePermitField: 'hi' } as unknown as TradingApi.NullablePermit

describe('processWrapResponse', () => {
  it('should process wrap response with gas fee result', () => {
    // Given
    const gasFeeResult: GasFeeResult = {
      value: '1000',
      displayValue: '0.001',
      isLoading: false,
      error: null,
      params: {
        gasLimit: '21000',
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '1000000000',
      },
    }
    const wrapTxRequest = {
      to: '0x123',
      value: '1000000',
    } as providers.TransactionRequest

    // When
    const result = processWrapResponse({ gasFeeResult, wrapTxRequest })

    // Then
    expect(result.gasFeeResult).toEqual(gasFeeResult)
    expect(result.txRequests?.[0]).toEqual({
      to: '0x123',
      value: '1000000',
      gasLimit: '21000',
      maxFeePerGas: '100000000000',
      maxPriorityFeePerGas: '1000000000',
    })
    expect(result.gasEstimate.wrapEstimate).toBe(gasFeeResult.gasEstimate)
    expect(result.swapRequestArgs).toBeUndefined()
  })
})

describe('processWrapResponse (smart contract unwrap fallback)', () => {
  it('should fallback to hardcoded gas limit when gas params are missing for a smart contract unwrap', () => {
    jest.isolateModules(() => {
      jest.doMock('utilities/src/platform', () => ({
        __esModule: true,
        ...jest.requireActual('utilities/src/platform'),
        isWebApp: true,
      }))

      const {
        processWrapResponse: mockedProcessWrapResponse,
      } = require('uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/utils')

      const {
        WRAP_FALLBACK_GAS_LIMIT_IN_GWEI,
      } = require('uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/constants')

      const gasFeeResult: GasFeeResult = {
        value: '1000',
        displayValue: '0.001',
        isLoading: false,
        error: null,
        params: undefined,
      }

      const wrapTxRequest = {
        to: '0x123',
        value: '1000000',
      } as providers.TransactionRequest

      const expectedGasLimit = WRAP_FALLBACK_GAS_LIMIT_IN_GWEI * 10e9

      const fallbackGasParams = { gasLimit: expectedGasLimit }

      const result = mockedProcessWrapResponse({
        gasFeeResult,
        wrapTxRequest,
        fallbackGasParams,
      })

      expect(result.txRequests?.[0]).toEqual(expect.objectContaining({ gasLimit: expectedGasLimit }))
    })
  })
})

describe('createPrepareSwapRequestParams', () => {
  it('should prepare swap request params for classic quote', () => {
    // Given
    const gasStrategy = DEFAULT_GAS_STRATEGY
    const prepareParams = createPrepareSwapRequestParams({
      gasStrategy,
    })

    const swapQuoteResponse = {
      quote: {} as TradingApi.ClassicQuote,
      routing: TradingApi.Routing.CLASSIC,
      requestId: '123',
      permitData: mockPermitData,
    } satisfies ClassicQuoteResponse
    const signature = '0x123'
    const transactionSettings: TransactionSettingsState = {
      customDeadline: 1800,
      selectedProtocols: DEFAULT_PROTOCOL_OPTIONS,
      slippageWarningModalSeen: false,
      isV4HookPoolsEnabled: false,
    }
    const alreadyApproved = true

    // When
    const result = prepareParams({
      swapQuoteResponse,
      signature,
      transactionSettings,
      alreadyApproved,
    })

    // Then
    expect(result).toEqual({
      quote: swapQuoteResponse.quote,
      permitData: swapQuoteResponse.permitData,
      signature,
      simulateTransaction: true,
      deadline: expect.any(Number),
      refreshGasPrice: true,
      gasStrategies: [DEFAULT_GAS_STRATEGY],
      urgency: undefined,
    })
  })
})

describe('getSimulationError', () => {
  it('should return error when simulation fails with SIMULATION_ERROR', () => {
    const swapQuote = {
      txFailureReasons: [TradingApi.TransactionFailureReason.SIMULATION_ERROR],
      route: [],
    } as TradingApi.ClassicQuote

    const error = getSimulationError({ swapQuote, isRevokeNeeded: false })

    expect(error).toBeInstanceOf(Error)
  })

  it('should ignore SIMULATION_ERROR when isRevokeNeeded is true', () => {
    const swapQuote = {
      txFailureReasons: [TradingApi.TransactionFailureReason.SIMULATION_ERROR],
      route: [],
    } as TradingApi.ClassicQuote

    const error = getSimulationError({ swapQuote, isRevokeNeeded: true })

    expect(error).toBeNull()
  })

  it('should return null for bridge quote', () => {
    const swapQuote = {} as TradingApi.BridgeQuote

    const error = getSimulationError({ swapQuote, isRevokeNeeded: false })

    expect(error).toBeNull()
  })
})

describe('getShouldSkipSwapRequest', () => {
  const mockTrade = { trade: { quote: { permitData: null } } } as unknown as TradeWithStatus
  const mockTradeNeedingPermit = {
    trade: { quote: { permitData: { fakePermitField: 'hi' } } },
  } as unknown as TradeWithStatus
  const baseDerivedSwapInfo = {
    trade: mockTrade,
    currencyAmounts: {
      [CurrencyField.INPUT]: CurrencyAmount.fromRawAmount(USDC, '500'),
      [CurrencyField.OUTPUT]: CurrencyAmount.fromRawAmount(DAI, '500'),
    },
    currencyBalances: {
      [CurrencyField.INPUT]: CurrencyAmount.fromRawAmount(USDC, '500'),
      [CurrencyField.OUTPUT]: CurrencyAmount.fromRawAmount(DAI, '500'),
    },
    wrapType: WrapType.NotApplicable,
  } as unknown as DerivedSwapInfo
  const baseTokenApprovalInfo = {
    action: ApprovalAction.None,
    txRequest: null,
    cancelTxRequest: null,
  } as TokenApprovalInfo

  const baseValidInput = {
    derivedSwapInfo: baseDerivedSwapInfo,
    tokenApprovalInfo: baseTokenApprovalInfo,
    signature: undefined,
  }

  it('should return false for typical input', () => {
    const result = getShouldSkipSwapRequest(baseValidInput)

    expect(result).toBe(false)
  })

  it('should return true if a permit is needed but not provided', () => {
    // Given
    const input = {
      ...baseValidInput,
      derivedSwapInfo: {
        ...baseDerivedSwapInfo,
        trade: mockTradeNeedingPermit,
      },
    }

    // When
    const result = getShouldSkipSwapRequest(input)

    // Then
    expect(result).toBe(true)
  })

  it('should return false if a permit is needed and provided', () => {
    // Given
    const input = {
      ...baseValidInput,
      derivedSwapInfo: {
        ...baseDerivedSwapInfo,
        trade: mockTradeNeedingPermit,
      },
      signature: '0x123',
    }

    // When
    const result = getShouldSkipSwapRequest(input)

    // Then
    expect(result).toBe(false)
  })

  it('should return true when amount exceeds balance', () => {
    // Given
    const derivedSwapInfo = {
      ...baseDerivedSwapInfo,
      currencyAmounts: {
        [CurrencyField.INPUT]: CurrencyAmount.fromRawAmount(USDC, '1000'),
        [CurrencyField.OUTPUT]: CurrencyAmount.fromRawAmount(DAI, '1000'),
      },
    } as unknown as DerivedSwapInfo

    // When
    const result = getShouldSkipSwapRequest({
      ...baseValidInput,
      derivedSwapInfo,
    })

    // Then
    expect(result).toBe(true)
  })

  it('should return true when unknown approval action is passed', () => {
    // Given
    const tokenApprovalInfo = {
      action: ApprovalAction.Unknown,
      txRequest: null,
      cancelTxRequest: null,
    } as const

    // When
    const result = getShouldSkipSwapRequest({
      ...baseValidInput,
      tokenApprovalInfo,
    })

    // Then
    expect(result).toBe(true)
  })
})

describe('createProcessSwapResponse', () => {
  const gasStrategy = DEFAULT_GAS_STRATEGY
  const processSwapResponse = createProcessSwapResponse({ gasStrategy })

  it('should process successful swap response', () => {
    // Given
    const swapQuote = {
      gasFee: '1000',
      route: [],
    } as TradingApi.ClassicQuote

    const response = {
      requestId: '123',
      transactions: [
        {
          to: '0x123',
          data: '0x456',
          from: '0x123',
          value: '0',
          chainId: 1,
        },
      ],
      gasEstimate: {
        strategy: DEFAULT_GAS_STRATEGY,
        gasLimit: '21000',
        maxFeePerGas: '100000000000',
        maxPriorityFeePerGas: '1000000000',
        type: FeeType.EIP1559,
        gasFee: '1000',
      },
    } as const satisfies SwapData

    // When
    const result = processSwapResponse({
      response,
      error: null,
      swapQuote,
      isSwapLoading: false,
      permitData: mockPermitData,
      swapRequestParams: { quote: swapQuote },
      isRevokeNeeded: false,
    })

    // Then
    expect(result).toEqual({
      gasFeeResult: {
        value: '1000',
        displayValue: expect.any(String),
        isLoading: false,
        error: null,
      },
      txRequests: response.transactions,
      permitData: mockPermitData,
      gasEstimate: {
        swapEstimate: response.gasEstimate,
      },
      swapRequestArgs: { quote: swapQuote },
    })
  })

  it('should handle simulation error', () => {
    // Given
    const swapQuote = {
      gasFee: '1000',
      txFailureReasons: [TradingApi.TransactionFailureReason.SIMULATION_ERROR],
      route: [],
    } as TradingApi.ClassicQuote

    // When
    const result = processSwapResponse({
      response: undefined,
      error: null,
      swapQuote,
      isSwapLoading: false,
      permitData: undefined,
      swapRequestParams: { quote: swapQuote },
      isRevokeNeeded: false,
    })

    // Then
    expect(result.gasFeeResult.error).toBeInstanceOf(UnknownSimulationError)
  })
})

describe('Kasane revert decoding', () => {
  it('decodes Error(string) revert data', () => {
    const reason = 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT'
    const encodedReason =
      '0x08c379a0' +
      '0000000000000000000000000000000000000000000000000000000000000020' +
      '000000000000000000000000000000000000000000000000000000000000002b' +
      Buffer.from(reason, 'utf8').toString('hex').padEnd(64 * 2, '0')

    expect(extractRevertReason({ data: encodedReason })).toBe(reason)
  })

  it('decodes Panic(uint256) revert data', () => {
    expect(
      extractRevertReason({
        data: '0x4e487b710000000000000000000000000000000000000000000000000000000000000011',
      }),
    ).toBe('panic code 17')
  })
})

describe('Kasane native wrap tx builder', () => {
  it('builds deposit() tx for native -> wrapped', () => {
    const tx = buildKasaneNativeWrapTx({
      isNativeToWrapped: true,
      isWrappedToNative: false,
      wrappedNative: '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
      from: '0x909d57e94b8f385ce9389d6b88dc6dec6fb5f7c0',
      chainId: 4801360,
      amountIn: BigInt('10000000000000000'),
      amountOut: BigInt('10000000000000000'),
    })

    expect(tx).toBeDefined()
    expect(tx?.to).toBe('0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79')
    expect(tx?.value).toBe('10000000000000000')
    expect(tx?.data).toBe('0xd0e30db0')
  })

  it('builds withdraw(uint256) tx for wrapped -> native', () => {
    const tx = buildKasaneNativeWrapTx({
      isNativeToWrapped: false,
      isWrappedToNative: true,
      wrappedNative: '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
      from: '0x909d57e94b8f385ce9389d6b88dc6dec6fb5f7c0',
      chainId: 4801360,
      amountIn: BigInt('10000000000000000'),
      amountOut: BigInt('10000000000000000'),
    })

    expect(tx).toBeDefined()
    expect(tx?.value).toBe('0')
    expect(tx?.data?.startsWith('0x2e1a7d4d')).toBe(true)
  })

  it('returns undefined for non 1:1 wrap quote', () => {
    const tx = buildKasaneNativeWrapTx({
      isNativeToWrapped: true,
      isWrappedToNative: false,
      wrappedNative: '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
      from: '0x909d57e94b8f385ce9389d6b88dc6dec6fb5f7c0',
      chainId: 4801360,
      amountIn: BigInt('10000000000000000'),
      amountOut: BigInt('9000000000000000'),
    })

    expect(tx).toBeUndefined()
  })
})

describe('Kasane path validation', () => {
  it('detects duplicated path endpoints', () => {
    expect(
      hasKasaneDuplicatedPathEndpoints([
        '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
        '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
      ]),
    ).toBe(true)
    expect(
      hasKasaneDuplicatedPathEndpoints([
        '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
        '0xd55577f68db301104f9ee3b2f27f25a08942bff9',
      ]),
    ).toBe(false)
  })
})

describe('withKasaneRpcGasEstimate preflight', () => {
  const originalProviderCtor = providers.JsonRpcProvider

  afterEach(() => {
    Object.defineProperty(providers, 'JsonRpcProvider', {
      configurable: true,
      value: originalProviderCtor,
    })
    jest.restoreAllMocks()
  })

  it('returns simulation error when eth_call fails after estimateGas', async () => {
    const provider = new providers.JsonRpcProvider()
    jest.spyOn(provider, 'send').mockImplementation(async (method: string) => {
      if (method === 'eth_getTransactionCount') {
        return '0x1'
      }
      if (method === 'eth_maxPriorityFeePerGas') {
        return '0x3b9aca00'
      }
      if (method === 'eth_feeHistory') {
        return { baseFeePerGas: ['0x3b9aca00'] }
      }
      if (method === 'eth_gasPrice') {
        return '0x3b9aca00'
      }
      throw new Error(`unexpected method: ${method}`)
    })
    jest.spyOn(provider, 'estimateGas').mockResolvedValue(BigNumber.from('152000'))
    jest.spyOn(provider, 'call').mockRejectedValue(new Error('execution reverted: UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT'))
    Object.defineProperty(providers, 'JsonRpcProvider', {
      configurable: true,
      value: jest.fn(() => provider),
    })

    const result = await withKasaneRpcGasEstimate({
      to: '0xe5455e558b8701a32b12f8881ff72a35d771b672',
      from: '0x909d57e94b8f385ce9389d6b88dc6dec6fb5f7c0',
      chainId: 4801360,
      data: '0x7ff36ab5',
      value: '10000000000000000',
    })

    expect(result.gasFeeResult.error?.message).toContain('INSUFFICIENT_OUTPUT_AMOUNT')
  })
})
