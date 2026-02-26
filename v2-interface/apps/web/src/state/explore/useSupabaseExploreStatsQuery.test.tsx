import { waitFor } from '@testing-library/react'
import { useSupabaseTotalTvlQuery, useSupabaseTotalVolume24hQuery } from 'state/explore/useSupabaseExploreStatsQuery'
import { renderHook } from 'test-utils/render'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { vi } from 'vitest'

describe('useSupabaseExploreStatsQuery totals parsers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses total_tvl_usd when PostgREST returns numeric as string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify([{ total_tvl_usd: '12345.67' }]), { status: 200 })
      }),
    )

    const { result } = renderHook(() =>
      useSupabaseTotalTvlQuery({
        chainId: UniverseChainId.Kasane,
        enabled: true,
      }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(12345.67)
  })

  it('parses total_volume_24h_usd when PostgREST returns numeric as string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify([{ total_volume_24h_usd: '765.43' }]), { status: 200 })
      }),
    )

    const { result } = renderHook(() =>
      useSupabaseTotalVolume24hQuery({
        chainId: UniverseChainId.Kasane,
        enabled: true,
      }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(765.43)
  })
})
