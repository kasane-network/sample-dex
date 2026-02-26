import { fetchBinanceNativeMarketStats } from '@universe/api/src/tokenIndexer/binancePrice'
import { describe, expect, it, vi } from 'vitest'

describe('fetchBinanceNativeMarketStats', () => {
  it('parses 24h ticker payload', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          lastPrice: '12.34',
          priceChangePercent: '-1.23',
          quoteVolume: '456789.01',
        }),
        { status: 200 },
      ),
    )

    const result = await fetchBinanceNativeMarketStats({ symbol: 'icpusdt', fetchImpl })

    expect(result).toEqual({
      priceUsd: 12.34,
      priceChange1dPct: -1.23,
      volume24hUsd: 456789.01,
    })
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('symbol=ICPUSDT')
  })

  it('returns null on malformed payload', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ lastPrice: '1.0' }), { status: 200 }))
    const result = await fetchBinanceNativeMarketStats({ symbol: 'ICPUSDT', fetchImpl })
    expect(result).toBeNull()
  })
})
