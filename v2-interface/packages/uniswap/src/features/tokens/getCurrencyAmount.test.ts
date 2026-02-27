import { Token } from '@uniswap/sdk-core'

import { getCurrencyAmount, ValueType } from 'uniswap/src/features/tokens/getCurrencyAmount'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

describe('getCurrencyAmount', () => {
  const testToken = new Token(
    UniverseChainId.Mainnet,
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    6,
    'USDC',
    'USD Coin',
  )

  it('normalizes excessive decimals for exact values', () => {
    const amount = getCurrencyAmount({
      value: '1.123456789',
      valueType: ValueType.Exact,
      currency: testToken,
    })

    expect(amount?.quotient.toString()).toBe('1123456')
  })
})
