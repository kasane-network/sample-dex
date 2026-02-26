import { createSupabaseTokenReadClient } from '@universe/api/src/tokenIndexer/supabaseReadClient'
import { describe, expect, it, vi } from 'vitest'

describe('createSupabaseTokenReadClient', () => {
  it('builds list query and maps rows', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              chain_id: 1,
              address: '0xabc',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              verified: true,
              is_spam: false,
              priority: 10,
              source_primary: 'official-list',
              updated_at: '2026-02-22T09:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
    )

    const client = createSupabaseTokenReadClient({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    })

    const rows = await client.listTokens({ chainId: 1, limit: 10 })

    expect(rows).toHaveLength(1)
    expect(rows[0].registry.symbol).toBe('USDC')
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/v1/v_token_registry_public')
  })
})
