import { deriveTokenPricesFromPools, estimatePoolTvlUsd } from '@universe/api/src/tokenIndexer/poolMarketPricing'
import { describe, expect, it } from 'vitest'

describe('poolMarketPricing', () => {
  it('derives non-stable token prices from connected pools', () => {
    const prices = deriveTokenPricesFromPools({
      stableTokenAddresses: ['0xusdc'],
      pools: [
        {
          token0Address: '0xtesteth',
          token1Address: '0xusdc',
          reserve0: 1,
          reserve1: 2000,
        },
        {
          token0Address: '0xicp',
          token1Address: '0xtesteth',
          reserve0: 10,
          reserve1: 1,
        },
      ],
    })

    expect(prices.get('0xusdc')).toBe(1)
    expect(prices.get('0xtesteth')).toBe(2000)
    expect(prices.get('0xicp')).toBe(200)
  })

  it('estimates pool tvl from a single-side priced pool', () => {
    const tvlUsd = estimatePoolTvlUsd({
      reserve0: 10,
      reserve1: 1,
      token0PriceUsd: undefined,
      token1PriceUsd: 2000,
    })

    expect(tvlUsd).toBe(4000)
  })
})
