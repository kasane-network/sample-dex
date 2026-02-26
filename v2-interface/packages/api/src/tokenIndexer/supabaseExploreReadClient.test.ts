import { createSupabaseExploreReadClient } from '@universe/api/src/tokenIndexer/supabaseExploreReadClient'
import { describe, expect, it, vi } from 'vitest'

describe('createSupabaseExploreReadClient', () => {
  it('builds token query and maps rows', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 4801360,
              address: '0xabc',
              symbol: 'KAS',
              name: 'Kasane Token',
              decimals: 18,
              logo_uri: 'https://example.com/kas.png',
              verified: true,
              source_primary: 'kasane-list',
              liquidity_usd: 1234,
              volume_24h_usd: 456,
              price_usd: 1.25,
              price_change_1h_pct: 0.5,
              price_change_1d_pct: 2.25,
              fdv_usd: 999999,
              volume_1h_usd: 23,
              volume_1w_usd: 789,
              volume_1m_usd: 4567,
              volume_1y_usd: 12345,
              sparkline_1d: [1, 2, 3],
              updated_at: '2026-02-23T12:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseExploreReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const rows = await client.listTopTokens({ chainId: 4801360, limit: 20 })

    expect(rows).toHaveLength(1)
    expect(rows[0].symbol).toBe('KAS')
    expect(rows[0].priceUsd).toBe(1.25)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/v1/v_token_search_public')
  })

  it('builds pool query and maps rows', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 4801360,
              address: '0xpool',
              protocol_version: 'v2',
              fee_tier_bps: 30,
              token0_address: '0xt0',
              token1_address: '0xt1',
              token0_symbol: 'AAA',
              token1_symbol: 'BBB',
              token0_name: 'Token AAA',
              token1_name: 'Token BBB',
              token0_decimals: 18,
              token1_decimals: 6,
              token0_logo_uri: null,
              token1_logo_uri: null,
              tvl_usd: 10000,
              volume_24h_usd: 400,
              volume_30d_usd: 7000,
              boosted_apr: 12.5,
              updated_at: '2026-02-23T12:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseExploreReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const rows = await client.listTopPools({ chainId: 4801360, limit: 20, protocolVersion: 'v2' })

    expect(rows).toHaveLength(1)
    expect(rows[0].protocolVersion).toBe('v2')
    expect(rows[0].tvlUsd).toBe(10000)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/v1/v_pool_market_snapshot_public')
    expect(String(fetchImpl.mock.calls[0][0])).toContain('protocol_version=eq.v2')
  })

  it('normalizes pool numeric fields when Supabase returns strings', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 4801360,
              address: '0xpool',
              protocol_version: 'v2',
              fee_tier_bps: '30',
              token0_address: '0xt0',
              token1_address: '0xt1',
              token0_symbol: 'ICP',
              token1_symbol: 'testETH',
              token0_name: 'Internet Computer',
              token1_name: 'Test ETH',
              token0_decimals: '18',
              token1_decimals: '18',
              token0_logo_uri: null,
              token1_logo_uri: null,
              tvl_usd: '3988.071718',
              volume_24h_usd: '0',
              volume_30d_usd: '123.45',
              boosted_apr: '1.25',
              updated_at: '2026-02-23T12:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseExploreReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const rows = await client.listTopPools({ chainId: 4801360, limit: 20, protocolVersion: 'v2' })

    expect(rows).toHaveLength(1)
    expect(rows[0].feeTierBps).toBe(30)
    expect(rows[0].token0Decimals).toBe(18)
    expect(rows[0].token1Decimals).toBe(18)
    expect(rows[0].tvlUsd).toBe(3988.071718)
    expect(rows[0].volume24hUsd).toBe(0)
    expect(rows[0].volume30dUsd).toBe(123.45)
    expect(rows[0].boostedApr).toBe(1.25)
  })

  it('builds user v2 positions query and maps rows', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 4801360,
              wallet_address: '0xwallet',
              pair_address: '0xpair',
              token0_address: '0xt0',
              token1_address: '0xt1',
              token0_symbol: 'AAA',
              token1_symbol: 'BBB',
              token0_decimals: 18,
              token1_decimals: 6,
              user_amount0_raw: '100',
              user_amount1_raw: '200',
              lp_balance_raw: '300',
              pool_share_ratio: 0.0123,
              updated_at: '2026-02-23T12:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseExploreReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const rows = await client.listUserV2Positions({ chainId: 4801360, walletAddress: '0xWallet' })

    expect(rows).toHaveLength(1)
    expect(rows[0].pairAddress).toBe('0xpair')
    expect(rows[0].poolShareRatio).toBe(0.0123)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/v1/v_v2_user_lp_positions_public')
    expect(String(fetchImpl.mock.calls[0][0])).toContain('wallet_address=eq.0xwallet')
  })

  it('builds total tvl query and maps response', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 4801360,
              total_tvl_usd: 1234567.89,
              updated_at: '2026-02-26T12:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseExploreReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const totalTvl = await client.getTotalTvl({ chainId: 4801360 })

    expect(totalTvl).toBe(1234567.89)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/v1/v_pool_market_totals_public')
    expect(String(fetchImpl.mock.calls[0][0])).toContain('chain_id=eq.4801360')
  })
})
