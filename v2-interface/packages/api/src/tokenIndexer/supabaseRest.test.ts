import { SupabaseTokenIndexerRepository } from '@universe/api/src/tokenIndexer/supabaseRest'
import { describe, expect, it, vi } from 'vitest'

describe('SupabaseTokenIndexerRepository', () => {
  it('sends PostgREST upsert request with merge-duplicates preference', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }))
    const repository = new SupabaseTokenIndexerRepository({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'secret',
      fetchImpl,
    })

    await repository.upsertTokenRegistry([
      {
        chainId: 1,
        address: '0xabc',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoUri: null,
        verified: true,
        isSpam: false,
        priority: 5,
        sourcePrimary: 'official-list',
        updatedAt: '2026-02-22T09:00:00.000Z',
      },
    ])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = fetchImpl.mock.calls[0]

    expect(String(url)).toContain('/rest/v1/token_registry?on_conflict=chain_id,address')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      apikey: 'secret',
      authorization: 'Bearer secret',
      prefer: 'resolution=merge-duplicates,return=minimal',
    })
  })

  it('upserts pool market snapshots to pool_market_snapshot table', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }))
    const repository = new SupabaseTokenIndexerRepository({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'secret',
      fetchImpl,
    })

    await repository.upsertPoolMarketSnapshot([
      {
        chainId: 1,
        address: '0xpool',
        protocolVersion: 'v3',
        feeTierBps: 500,
        token0Address: '0xaaa',
        token1Address: '0xbbb',
        token0Symbol: 'AAA',
        token1Symbol: 'BBB',
        token0Name: 'Token AAA',
        token1Name: 'Token BBB',
        token0Decimals: 18,
        token1Decimals: 6,
        token0LogoUri: null,
        token1LogoUri: null,
        tvlUsd: 1000,
        volume24hUsd: 100,
        volume30dUsd: 1000,
        boostedApr: null,
        updatedAt: '2026-02-23T00:00:00.000Z',
      },
    ])

    const [url] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('/rest/v1/pool_market_snapshot?on_conflict=chain_id,address')
  })

  it('upserts v2 user positions with wallet+pair conflict key', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }))
    const repository = new SupabaseTokenIndexerRepository({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'secret',
      fetchImpl,
    })

    await repository.upsertV2UserLpPositions([
      {
        chainId: 4801360,
        walletAddress: '0xwallet',
        pairAddress: '0xpair',
        lpBalanceRaw: '100',
        lpTotalSupplyRaw: '1000',
        reserve0Raw: '500',
        reserve1Raw: '1000',
        token0Address: '0xt0',
        token1Address: '0xt1',
        token0Symbol: 'A',
        token1Symbol: 'B',
        token0Decimals: 18,
        token1Decimals: 6,
        userAmount0Raw: '50',
        userAmount1Raw: '100',
        updatedAt: '2026-02-26T00:00:00.000Z',
      },
    ])

    const [url] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('/rest/v1/v2_user_lp_positions?on_conflict=chain_id,wallet_address,pair_address')
  })
})
