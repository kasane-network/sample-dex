import type { TokenReadModel } from '@universe/api/src/tokenIndexer/supabaseReadClient'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { toCurrencyInfoFromSupabase } from 'uniswap/src/features/dataApi/searchTokens'

describe(toCurrencyInfoFromSupabase, () => {
  const baseModel: TokenReadModel = {
    registry: {
      chainId: UniverseChainId.Kasane,
      address: '0x6052dfc3d327bbe13d182e31a207e4c82cf34a5e',
      symbol: 'testUSDC',
      name: 'Kasane Test USDC',
      decimals: 6,
      logoUri: null,
      verified: true,
      isSpam: false,
      priority: 0,
      sourcePrimary: 'list',
      updatedAt: '2026-02-22T00:00:00.000Z',
    },
    market: {
      liquidityUsd: 1,
      volume24hUsd: 1,
      updatedAt: '2026-02-22T00:00:00.000Z',
    },
    search: {
      searchText: 'testusdc',
      rankScore: 1,
      updatedAt: '2026-02-22T00:00:00.000Z',
    },
  }

  it('converts Kasane model into CurrencyInfo', () => {
    const info = toCurrencyInfoFromSupabase(baseModel)

    expect(info?.currency.chainId).toBe(UniverseChainId.Kasane)
    expect(info?.currency.symbol).toBe('testUSDC')
    expect(info?.isSpam).toBe(false)
  })

  it('returns null for non-Kasane chain data', () => {
    const info = toCurrencyInfoFromSupabase({
      ...baseModel,
      registry: {
        ...baseModel.registry,
        chainId: UniverseChainId.Mainnet,
      },
    })

    expect(info).toBeNull()
  })
})
