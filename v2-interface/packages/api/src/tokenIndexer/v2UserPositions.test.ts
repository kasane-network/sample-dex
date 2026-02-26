import { buildV2UserLpPositionRecord, computeUnderlyingRawAmounts } from '@universe/api/src/tokenIndexer/v2UserPositions'
import { describe, expect, it } from 'vitest'

describe('v2UserPositions', () => {
  it('computes underlying amounts from LP share', () => {
    const result = computeUnderlyingRawAmounts({
      lpBalanceRaw: 50n,
      lpTotalSupplyRaw: 100n,
      reserve0Raw: 1_000n,
      reserve1Raw: 2_000n,
    })

    expect(result.amount0Raw).toBe(500n)
    expect(result.amount1Raw).toBe(1_000n)
  })

  it('returns zero underlying amounts when total supply is zero', () => {
    const result = computeUnderlyingRawAmounts({
      lpBalanceRaw: 10n,
      lpTotalSupplyRaw: 0n,
      reserve0Raw: 1_000n,
      reserve1Raw: 2_000n,
    })

    expect(result.amount0Raw).toBe(0n)
    expect(result.amount1Raw).toBe(0n)
  })

  it('normalizes addresses and serializes bigint fields', () => {
    const record = buildV2UserLpPositionRecord({
      chainId: 4801360,
      walletAddress: '0xABCD',
      pairAddress: '0xPAIR',
      lpBalanceRaw: 25n,
      lpTotalSupplyRaw: 100n,
      reserve0Raw: 1_000n,
      reserve1Raw: 2_000n,
      token0Address: '0xT0',
      token1Address: '0xT1',
      token0Symbol: 'testUSDC',
      token1Symbol: 'testETH',
      token0Decimals: 6,
      token1Decimals: 18,
      updatedAtIso: '2026-02-26T00:00:00.000Z',
    })

    expect(record.walletAddress).toBe('0xabcd')
    expect(record.pairAddress).toBe('0xpair')
    expect(record.lpBalanceRaw).toBe('25')
    expect(record.userAmount0Raw).toBe('250')
    expect(record.userAmount1Raw).toBe('500')
  })
})
