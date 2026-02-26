import { buildSearchText, normalizeTokenRegistry } from '@universe/api/src/tokenIndexer/normalize'
import { TokenListSource } from '@universe/api/src/tokenIndexer/types'
import { describe, expect, it } from 'vitest'

describe('normalizeTokenRegistry', () => {
  it('deduplicates by chain_id + lowercased address and applies overrides', () => {
    const sources: TokenListSource[] = [
      {
        sourceName: 'community-default',
        tokens: [
          {
            chainId: 1,
            address: '0xAbC',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          },
        ],
      },
      {
        sourceName: 'official-list',
        tokens: [
          {
            chainId: 1,
            address: '0xabc',
            symbol: 'USDC.e',
            name: 'USD Coin Bridged',
            decimals: 6,
            logoURI: 'https://example.com/usdc.png',
          },
        ],
      },
    ]

    const overrides = new Map([
      [
        '0xabc',
        {
          verified: true,
          priority: 12,
        },
      ],
    ])

    const records = normalizeTokenRegistry({
      chainId: 1,
      sources,
      overridesByAddress: overrides,
      updatedAtIso: '2026-02-22T09:00:00.000Z',
    })

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      chainId: 1,
      address: '0xabc',
      verified: true,
      priority: 12,
      sourcePrimary: 'official-list',
      logoUri: 'https://example.com/usdc.png',
    })
  })
})

describe('buildSearchText', () => {
  it('normalizes symbol, name, and address', () => {
    const text = buildSearchText({
      symbol: 'USDC.e',
      name: 'USD Coin (Bridged)',
      address: '0xAbC',
    })

    expect(text).toBe('usdc e usd coin bridged 0xabc')
  })
})
