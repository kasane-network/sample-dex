import { Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import {
  computeV2AmountInRaw,
  computeV2AmountOutRaw,
  isNativeWrappedPair,
} from 'uniswap/src/features/transactions/swap/services/tradeService/rpcIndicativeQuote'
import { WRAPPED_NATIVE_CURRENCY, nativeOnChain } from 'uniswap/src/constants/tokens'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

describe('rpcIndicativeQuote math', () => {
  it('computes amountOut with V2 fee formula', () => {
    const amountOut = computeV2AmountOutRaw(JSBI.BigInt(100), JSBI.BigInt(1000), JSBI.BigInt(1000))
    expect(JSBI.equal(amountOut, JSBI.BigInt(90))).toBe(true)
  })

  it('computes amountIn with V2 fee formula', () => {
    const amountIn = computeV2AmountInRaw(JSBI.BigInt(90), JSBI.BigInt(1000), JSBI.BigInt(1000))
    expect(amountIn && JSBI.equal(amountIn, JSBI.BigInt(100))).toBe(true)
  })

  it('returns zero amountOut for invalid inputs', () => {
    expect(JSBI.equal(computeV2AmountOutRaw(JSBI.BigInt(0), JSBI.BigInt(1000), JSBI.BigInt(1000)), JSBI.BigInt(0))).toBe(
      true,
    )
    expect(JSBI.equal(computeV2AmountOutRaw(JSBI.BigInt(1), JSBI.BigInt(0), JSBI.BigInt(1000)), JSBI.BigInt(0))).toBe(
      true,
    )
    expect(JSBI.equal(computeV2AmountOutRaw(JSBI.BigInt(1), JSBI.BigInt(1000), JSBI.BigInt(0)), JSBI.BigInt(0))).toBe(
      true,
    )
  })

  it('returns null amountIn for impossible output', () => {
    expect(computeV2AmountInRaw(JSBI.BigInt(1000), JSBI.BigInt(1000), JSBI.BigInt(1000))).toEqual(null)
    expect(computeV2AmountInRaw(JSBI.BigInt(0), JSBI.BigInt(1000), JSBI.BigInt(1000))).toEqual(null)
  })
})

describe('isNativeWrappedPair', () => {
  const ICP = nativeOnChain(UniverseChainId.Kasane)
  const WICP = WRAPPED_NATIVE_CURRENCY[UniverseChainId.Kasane]
  const TEST_USDC = new Token(UniverseChainId.Kasane, '0x2222222222222222222222222222222222222222', 6, 'USDC', 'USDC')

  it('returns true for native -> wrapped native', () => {
    expect(WICP).toBeDefined()
    expect(isNativeWrappedPair(ICP, WICP!)).toBe(true)
  })

  it('returns true for wrapped native -> native', () => {
    expect(WICP).toBeDefined()
    expect(isNativeWrappedPair(WICP!, ICP)).toBe(true)
  })

  it('returns false for non-wrap pairs', () => {
    expect(WICP).toBeDefined()
    expect(isNativeWrappedPair(WICP!, TEST_USDC)).toBe(false)
    expect(isNativeWrappedPair(ICP, TEST_USDC)).toBe(false)
  })
})
