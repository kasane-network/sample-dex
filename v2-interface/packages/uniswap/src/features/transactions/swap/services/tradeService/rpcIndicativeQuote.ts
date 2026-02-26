import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { TradingApi } from '@universe/api'
import JSBI from 'jsbi'
import { createPublicClient, getAddress, http, parseAbi, type Address } from 'viem'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { RPCType, UniverseChainId } from 'uniswap/src/features/chains/types'
import { parseQuoteCurrencies } from 'uniswap/src/features/transactions/swap/hooks/useTrade/parseQuoteCurrencies'
import { UNCONNECTED_ADDRESS } from 'uniswap/src/features/transactions/swap/services/tradeService/transformations/buildQuoteRequest'
import type { UseTradeArgs } from 'uniswap/src/features/transactions/swap/types/trade'
import { IndicativeTrade, KasaneV2Trade, validateIndicativeQuoteResponse } from 'uniswap/src/features/transactions/swap/types/trade'

const KASANE_V2_FACTORY_ADDRESS = '0x697c9e9ea0686515fea69f526f85b48d8569ec86'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const JSBI_ZERO = JSBI.BigInt(0)
const JSBI_ONE = JSBI.BigInt(1)
const V2_SWAP_FEE_NUMERATOR = JSBI.BigInt(997)
const V2_SWAP_FEE_DENOMINATOR = JSBI.BigInt(1000)
const ZERO_PRICE_IMPACT = new Percent(0, 1)

const V2_FACTORY_ABI = parseAbi(['function getPair(address tokenA, address tokenB) view returns (address pair)'])
const V2_PAIR_ABI = parseAbi([
  'function token0() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
])

interface RpcIndicativeTradeInput {
  currencyIn: Currency
  currencyOut: Currency
  requestTradeType: TradingApi.TradeType
  amountRaw: JSBI
  isNativeWrappedPair: boolean
  tokenInAddress: Address
  tokenOutAddress: Address
  activeAccountAddress?: string
}

interface PairReserves {
  reserveIn: JSBI
  reserveOut: JSBI
}

interface TwoHopQuoteResult {
  amountIn: JSBI | null
  amountOut: JSBI
  midRateNumerator: JSBI
  midRateDenominator: JSBI
}

export async function fetchRpcIndicativeTrade(input?: UseTradeArgs): Promise<IndicativeTrade | null> {
  const prepared = prepareRpcIndicativeTradeInput(input)
  if (!prepared) {
    return null
  }

  if (prepared.isNativeWrappedPair) {
    const recipient = normalizeRecipientAddress(prepared.activeAccountAddress)
    const quoteResponse: TradingApi.QuoteResponse = {
      requestId: 'rpc-indicative-wrap',
      routing: TradingApi.Routing.CLASSIC,
      permitData: null,
      quote: {
        input: {
          token: prepared.tokenInAddress,
          amount: prepared.amountRaw.toString(),
        },
        output: {
          token: prepared.tokenOutAddress,
          amount: prepared.amountRaw.toString(),
          recipient,
        },
        swapper: recipient,
      },
    }

    const validatedResponse = validateIndicativeQuoteResponse(quoteResponse)
    if (!validatedResponse) {
      return null
    }

    return new IndicativeTrade({
      quote: validatedResponse,
      currencyIn: prepared.currencyIn,
      currencyOut: prepared.currencyOut,
    })
  }

  const rpcUrl = getChainInfo(UniverseChainId.Kasane).rpcUrls[RPCType.Interface].http[0]
  if (!rpcUrl) {
    return null
  }

  const client = createPublicClient({ transport: http(rpcUrl) })
  const directPairReserves = await readPairReserves(client, prepared.tokenInAddress, prepared.tokenOutAddress)
  const twoHopQuote = directPairReserves ? undefined : await computeTwoHopQuote(client, prepared)
  const amountIn = directPairReserves
    ? prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
      ? prepared.amountRaw
      : computeV2AmountInRaw(prepared.amountRaw, directPairReserves.reserveIn, directPairReserves.reserveOut)
    : twoHopQuote?.amountIn ?? null
  const amountOut = directPairReserves
    ? prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
      ? computeV2AmountOutRaw(prepared.amountRaw, directPairReserves.reserveIn, directPairReserves.reserveOut)
      : prepared.amountRaw
    : twoHopQuote?.amountOut ?? JSBI_ZERO

  if (
    !amountIn ||
    JSBI.lessThanOrEqual(amountIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(amountOut, JSBI_ZERO)
  ) {
    return null
  }

  const recipient = normalizeRecipientAddress(prepared.activeAccountAddress)
  const quoteResponse: TradingApi.QuoteResponse = {
    requestId: 'rpc-indicative',
    routing: TradingApi.Routing.CLASSIC,
    permitData: null,
    quote: {
      input: {
        token: prepared.tokenInAddress,
        amount: amountIn.toString(),
      },
      output: {
        token: prepared.tokenOutAddress,
        amount: amountOut.toString(),
        recipient,
      },
      swapper: recipient,
    },
  }

  const validatedResponse = validateIndicativeQuoteResponse(quoteResponse)
  if (!validatedResponse) {
    return null
  }

  return new IndicativeTrade({
    quote: validatedResponse,
    currencyIn: prepared.currencyIn,
    currencyOut: prepared.currencyOut,
  })
}

async function computeTwoHopQuote(
  client: ReturnType<typeof createPublicClient>,
  prepared: RpcIndicativeTradeInput,
): Promise<TwoHopQuoteResult> {
  const bridgeTokenAddress = getAddress(getChainInfo(UniverseChainId.Kasane).tokens.stablecoins[0].address)
  if (
    bridgeTokenAddress.toLowerCase() === prepared.tokenInAddress.toLowerCase() ||
    bridgeTokenAddress.toLowerCase() === prepared.tokenOutAddress.toLowerCase()
  ) {
    return {
      amountIn: null,
      amountOut: JSBI_ZERO,
      midRateNumerator: JSBI_ZERO,
      midRateDenominator: JSBI_ONE,
    }
  }

  const inToBridge = await readPairReserves(client, prepared.tokenInAddress, bridgeTokenAddress)
  const bridgeToOut = await readPairReserves(client, bridgeTokenAddress, prepared.tokenOutAddress)
  if (!inToBridge || !bridgeToOut) {
    return {
      amountIn: null,
      amountOut: JSBI_ZERO,
      midRateNumerator: JSBI_ZERO,
      midRateDenominator: JSBI_ONE,
    }
  }

  const midRateNumerator = JSBI.multiply(inToBridge.reserveOut, bridgeToOut.reserveOut)
  const midRateDenominator = JSBI.multiply(inToBridge.reserveIn, bridgeToOut.reserveIn)

  if (prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT) {
    const bridgeAmount = computeV2AmountOutRaw(prepared.amountRaw, inToBridge.reserveIn, inToBridge.reserveOut)
    const finalOut = computeV2AmountOutRaw(bridgeAmount, bridgeToOut.reserveIn, bridgeToOut.reserveOut)
    return {
      amountIn: prepared.amountRaw,
      amountOut: finalOut,
      midRateNumerator,
      midRateDenominator,
    }
  }

  const bridgeAmountIn = computeV2AmountInRaw(prepared.amountRaw, bridgeToOut.reserveIn, bridgeToOut.reserveOut)
  if (!bridgeAmountIn) {
    return {
      amountIn: null,
      amountOut: JSBI_ZERO,
      midRateNumerator,
      midRateDenominator,
    }
  }

  const totalIn = computeV2AmountInRaw(bridgeAmountIn, inToBridge.reserveIn, inToBridge.reserveOut)
  return {
    amountIn: totalIn,
    amountOut: prepared.amountRaw,
    midRateNumerator,
    midRateDenominator,
  }
}

function computePriceImpactFromExecutionAndMid({
  executionAmountIn,
  executionAmountOut,
  midRateNumerator,
  midRateDenominator,
}: {
  executionAmountIn: JSBI
  executionAmountOut: JSBI
  midRateNumerator: JSBI
  midRateDenominator: JSBI
}): Percent | undefined {
  if (
    JSBI.lessThanOrEqual(executionAmountIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(executionAmountOut, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(midRateNumerator, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(midRateDenominator, JSBI_ZERO)
  ) {
    return undefined
  }

  const numerator = JSBI.subtract(
    JSBI.multiply(midRateNumerator, executionAmountIn),
    JSBI.multiply(executionAmountOut, midRateDenominator),
  )
  const denominator = JSBI.multiply(midRateNumerator, executionAmountIn)

  if (JSBI.equal(denominator, JSBI_ZERO)) {
    return undefined
  }

  return new Percent(numerator.toString(), denominator.toString())
}

async function readPairReserves(
  client: ReturnType<typeof createPublicClient>,
  tokenIn: Address,
  tokenOut: Address,
): Promise<PairReserves | null> {
  const factoryAddress = getAddress(KASANE_V2_FACTORY_ADDRESS)
  const pairAddress = await client.readContract({
    address: factoryAddress,
    abi: V2_FACTORY_ABI,
    functionName: 'getPair',
    args: [tokenIn, tokenOut],
  })

  if (pairAddress.toLowerCase() === ZERO_ADDRESS) {
    return null
  }

  const normalizedPairAddress = getAddress(pairAddress)
  const token0Address = await client.readContract({
    address: normalizedPairAddress,
    abi: V2_PAIR_ABI,
    functionName: 'token0',
  })
  const [reserve0, reserve1] = await client.readContract({
    address: normalizedPairAddress,
    abi: V2_PAIR_ABI,
    functionName: 'getReserves',
  })

  const isInputToken0 = token0Address.toLowerCase() === tokenIn.toLowerCase()
  return {
    reserveIn: JSBI.BigInt((isInputToken0 ? reserve0 : reserve1).toString()),
    reserveOut: JSBI.BigInt((isInputToken0 ? reserve1 : reserve0).toString()),
  }
}

function prepareRpcIndicativeTradeInput(input?: UseTradeArgs): RpcIndicativeTradeInput | null {
  if (
    !input ||
    input.skip ||
    input.isUSDQuote ||
    !input.amountSpecified ||
    JSBI.lessThanOrEqual(input.amountSpecified.quotient, JSBI_ZERO)
  ) {
    return null
  }

  const { currencyIn, currencyOut, requestTradeType } = parseQuoteCurrencies(input)
  if (!currencyIn || !currencyOut || currencyIn.equals(currencyOut)) {
    return null
  }

  if (currencyIn.chainId !== UniverseChainId.Kasane || currencyOut.chainId !== UniverseChainId.Kasane) {
    return null
  }

  return {
    currencyIn,
    currencyOut,
    requestTradeType,
    amountRaw: input.amountSpecified.quotient,
    isNativeWrappedPair: isNativeWrappedPair(currencyIn, currencyOut),
    tokenInAddress: getPairTokenAddress(currencyIn),
    tokenOutAddress: getPairTokenAddress(currencyOut),
    activeAccountAddress: input.account?.address,
  }
}

export function isNativeWrappedPair(currencyIn: Currency, currencyOut: Currency): boolean {
  if (currencyIn.chainId !== currencyOut.chainId) {
    return false
  }

  const wrappedNativeAddress = getAddress(getChainInfo(currencyIn.chainId).wrappedNativeCurrency.address)

  if (currencyIn.isNative && !currencyOut.isNative) {
    return getAddress(currencyOut.address).toLowerCase() === wrappedNativeAddress.toLowerCase()
  }

  if (currencyOut.isNative && !currencyIn.isNative) {
    return getAddress(currencyIn.address).toLowerCase() === wrappedNativeAddress.toLowerCase()
  }

  return false
}

function getPairTokenAddress(currency: Currency): Address {
  if (currency.isNative) {
    return getAddress(getChainInfo(currency.chainId).wrappedNativeCurrency.address)
  }
  return getAddress(currency.address)
}

function normalizeRecipientAddress(address?: string): Address {
  try {
    return getAddress(address ?? UNCONNECTED_ADDRESS)
  } catch {
    return getAddress(UNCONNECTED_ADDRESS)
  }
}

export function computeV2AmountOutRaw(amountIn: JSBI, reserveIn: JSBI, reserveOut: JSBI): JSBI {
  if (
    JSBI.lessThanOrEqual(amountIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(reserveIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(reserveOut, JSBI_ZERO)
  ) {
    return JSBI_ZERO
  }

  const amountInWithFee = JSBI.multiply(amountIn, V2_SWAP_FEE_NUMERATOR)
  const numerator = JSBI.multiply(amountInWithFee, reserveOut)
  const denominator = JSBI.add(JSBI.multiply(reserveIn, V2_SWAP_FEE_DENOMINATOR), amountInWithFee)
  if (JSBI.lessThanOrEqual(denominator, JSBI_ZERO)) {
    return JSBI_ZERO
  }

  return JSBI.divide(numerator, denominator)
}

export function computeV2AmountInRaw(amountOut: JSBI, reserveIn: JSBI, reserveOut: JSBI): JSBI | null {
  if (
    JSBI.lessThanOrEqual(amountOut, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(reserveIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(reserveOut, JSBI_ZERO) ||
    JSBI.greaterThanOrEqual(amountOut, reserveOut)
  ) {
    return null
  }

  const numerator = JSBI.multiply(JSBI.multiply(reserveIn, amountOut), V2_SWAP_FEE_DENOMINATOR)
  const denominator = JSBI.multiply(JSBI.subtract(reserveOut, amountOut), V2_SWAP_FEE_NUMERATOR)
  if (JSBI.lessThanOrEqual(denominator, JSBI_ZERO)) {
    return null
  }

  return JSBI.add(JSBI.divide(numerator, denominator), JSBI_ONE)
}

export async function fetchRpcTrade(input?: UseTradeArgs): Promise<KasaneV2Trade | null> {
  const prepared = prepareRpcIndicativeTradeInput(input)
  if (!prepared) {
    return null
  }

  if (prepared.isNativeWrappedPair) {
    const recipient = normalizeRecipientAddress(prepared.activeAccountAddress)
    const quoteResponse: TradingApi.QuoteResponse = {
      requestId: 'rpc-trade-wrap',
      routing: TradingApi.Routing.CLASSIC,
      permitData: null,
      quote: {
        input: {
          token: prepared.tokenInAddress,
          amount: prepared.amountRaw.toString(),
        },
        output: {
          token: prepared.tokenOutAddress,
          amount: prepared.amountRaw.toString(),
          recipient,
        },
        swapper: recipient,
      },
    }

    const validatedResponse = validateIndicativeQuoteResponse(quoteResponse)
    if (!validatedResponse) {
      return null
    }

    const tradeType = prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
      ? TradeType.EXACT_INPUT
      : TradeType.EXACT_OUTPUT

    return new KasaneV2Trade({
      quote: validatedResponse,
      currencyIn: prepared.currencyIn,
      currencyOut: prepared.currencyOut,
      tradeType,
      routePath: [prepared.tokenInAddress, prepared.tokenOutAddress],
      priceImpact: ZERO_PRICE_IMPACT,
    })
  }

  const rpcUrl = getChainInfo(UniverseChainId.Kasane).rpcUrls[RPCType.Interface].http[0]
  if (!rpcUrl) {
    return null
  }

  const client = createPublicClient({ transport: http(rpcUrl) })
  const directPairReserves = await readPairReserves(client, prepared.tokenInAddress, prepared.tokenOutAddress)

  const twoHopQuote = directPairReserves ? undefined : await computeTwoHopQuote(client, prepared)
  const amountIn = directPairReserves
    ? prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
      ? prepared.amountRaw
      : computeV2AmountInRaw(prepared.amountRaw, directPairReserves.reserveIn, directPairReserves.reserveOut)
    : twoHopQuote?.amountIn ?? null
  const amountOut = directPairReserves
    ? prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
      ? computeV2AmountOutRaw(prepared.amountRaw, directPairReserves.reserveIn, directPairReserves.reserveOut)
      : prepared.amountRaw
    : twoHopQuote?.amountOut ?? JSBI_ZERO
  const routePath = directPairReserves
    ? [prepared.tokenInAddress, prepared.tokenOutAddress]
    : [
        prepared.tokenInAddress,
        getAddress(getChainInfo(UniverseChainId.Kasane).tokens.stablecoins[0].address),
        prepared.tokenOutAddress,
      ]

  const priceImpact = directPairReserves
    ? computePriceImpactFromExecutionAndMid({
        executionAmountIn: amountIn ?? JSBI_ZERO,
        executionAmountOut: amountOut,
        midRateNumerator: directPairReserves.reserveOut,
        midRateDenominator: directPairReserves.reserveIn,
      })
    : computePriceImpactFromExecutionAndMid({
        executionAmountIn: amountIn ?? JSBI_ZERO,
        executionAmountOut: amountOut,
        midRateNumerator: twoHopQuote?.midRateNumerator ?? JSBI_ZERO,
        midRateDenominator: twoHopQuote?.midRateDenominator ?? JSBI_ONE,
      })

  if (
    !amountIn ||
    JSBI.lessThanOrEqual(amountIn, JSBI_ZERO) ||
    JSBI.lessThanOrEqual(amountOut, JSBI_ZERO)
  ) {
    return null
  }

  const recipient = normalizeRecipientAddress(prepared.activeAccountAddress)
  const quoteResponse: TradingApi.QuoteResponse = {
    requestId: 'rpc-trade',
    routing: TradingApi.Routing.CLASSIC,
    permitData: null,
    quote: {
      input: {
        token: prepared.tokenInAddress,
        amount: amountIn.toString(),
      },
      output: {
        token: prepared.tokenOutAddress,
        amount: amountOut.toString(),
        recipient,
      },
      swapper: recipient,
    },
  }

  const validatedResponse = validateIndicativeQuoteResponse(quoteResponse)
  if (!validatedResponse) {
    return null
  }

  const tradeType = prepared.requestTradeType === TradingApi.TradeType.EXACT_INPUT
    ? TradeType.EXACT_INPUT
    : TradeType.EXACT_OUTPUT

  return new KasaneV2Trade({
    quote: validatedResponse,
    currencyIn: prepared.currencyIn,
    currencyOut: prepared.currencyOut,
    tradeType,
    routePath,
    priceImpact,
  })
}
