import JSBI from 'jsbi'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { parseQuoteCurrencies } from 'uniswap/src/features/transactions/swap/hooks/useTrade/parseQuoteCurrencies'
import { fetchRpcIndicativeTrade, fetchRpcTrade } from 'uniswap/src/features/transactions/swap/services/tradeService/rpcIndicativeQuote'
import type { TradeRepository } from 'uniswap/src/features/transactions/swap/services/tradeService/tradeRepository'
import {
  TradeService,
  TradeWithGasEstimates,
} from 'uniswap/src/features/transactions/swap/services/tradeService/tradeService'
import {
  type ValidatedTradeInput,
} from 'uniswap/src/features/transactions/swap/services/tradeService/transformations/buildQuoteRequest'
import { IndicativeTrade, type UseTradeArgs } from 'uniswap/src/features/transactions/swap/types/trade'
import type { Logger } from 'utilities/src/logger/logger'

interface EVMTradeServiceContext {
  tradeRepository: TradeRepository
  logger?: Logger
  getIsUniswapXSupported?: (chainId?: number) => boolean
  getEnabledChains: () => number[]
  getIsL2ChainId: (chainId?: number) => boolean
  getMinAutoSlippageToleranceL2: () => number
}

export function createEVMTradeService(ctx: EVMTradeServiceContext): TradeService {
  return {
    prepareTradeInput: prepareTradingApiTradeInput,
    prepareIndicativeTradeInput,

    async getTrade(input: UseTradeArgs): Promise<TradeWithGasEstimates> {
      try {
        const trade = await fetchRpcTrade(input)
        return { trade }
      } catch (e) {
        ctx.logger?.error(e, {
          tags: { file: 'tradeService.ts', function: 'getTrade/rpc-only' },
        })
        return { trade: null }
      }
    },

    async getIndicativeTrade(input: UseTradeArgs): Promise<IndicativeTrade | null> {
      try {
        return await fetchRpcIndicativeTrade(input)
      } catch (error) {
        ctx.logger?.error(error, {
          tags: { file: 'tradeService.ts', function: 'getIndicativeTrade/rpc' },
        })
        return null
      }
    },
  }
}

function prepareTradingApiTradeInput(input?: UseTradeArgs): ValidatedTradeInput | null {
  return prepareIndicativeTradeInput(input)
}

function prepareIndicativeTradeInput(input?: UseTradeArgs): ValidatedTradeInput | null {
  if (
    !input ||
    input.skip ||
    input.isUSDQuote ||
    !input.amountSpecified ||
    JSBI.lessThanOrEqual(input.amountSpecified.quotient, JSBI.BigInt(0))
  ) {
    return null
  }

  const { currencyIn, currencyOut, requestTradeType } = parseQuoteCurrencies(input)
  if (!currencyIn || !currencyOut || currencyIn.equals(currencyOut)) {
    return null
  }

  const tokenInAddress = currencyIn.isNative
    ? getChainInfo(currencyIn.chainId).wrappedNativeCurrency.address
    : currencyIn.address
  const tokenOutAddress = currencyOut.isNative
    ? getChainInfo(currencyOut.chainId).wrappedNativeCurrency.address
    : currencyOut.address

  return {
    currencyIn,
    currencyOut,
    amount: input.amountSpecified,
    requestTradeType,
    activeAccountAddress: input.account?.address,
    tokenInChainId: currencyIn.chainId,
    tokenOutChainId: currencyOut.chainId,
    tokenInAddress,
    tokenOutAddress,
    generatePermitAsTransaction: input.generatePermitAsTransaction,
    isUSDQuote: input.isUSDQuote ?? false,
  }
}
