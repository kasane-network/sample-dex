import { waitFor } from '@testing-library/react'
import { usePoolData } from 'dataLayer/data/pools/usePoolData'
import { GraphQLApi } from '@universe/api'
import { renderHook } from 'test-utils/render'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

const { mockUseReadContracts } = vi.hoisted(() => ({
  mockUseReadContracts: vi.fn(),
}))

vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi')
  return {
    ...actual,
    useReadContracts: mockUseReadContracts,
  }
})

if (!('IntersectionObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
    writable: true,
  })
}

describe('usePoolData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify([
            {
              fee_tier_bps: 30,
              token0_symbol: 'USDC',
              token1_symbol: 'WMON',
              token0_name: 'USD Coin',
              token1_name: 'Wrapped Monad',
              token0_decimals: 6,
              token1_decimals: 18,
              token0_logo_uri: 'https://example.com/usdc.png',
              token1_logo_uri: 'https://example.com/wmon.png',
              tvl_usd: '120000',
              volume_24h_usd: '15000',
            },
          ]),
          { status: 200 },
        )
      }),
    )
  })

  it('Kasane V2 pool address の場合に RPC + Supabase から PoolData を構築する', async () => {
    mockUseReadContracts.mockImplementation((input: { contracts: readonly unknown[]; query?: { enabled?: boolean } }) => {
      if (!input.query?.enabled) {
        return { data: undefined, isLoading: false, error: undefined }
      }

      if (input.contracts.length === 4) {
        return {
          data: [
            { result: '0x1111111111111111111111111111111111111111' },
            { result: '0x2222222222222222222222222222222222222222' },
            { result: [1_500_000_000n, 3_000_000_000_000_000_000n, 0n] },
            { result: 4_500_000_000_000_000_000n },
          ],
          isLoading: false,
          error: undefined,
        }
      }

      if (input.contracts.length === 6) {
        return {
          data: [
            { result: 'USDC' },
            { result: 'USD Coin' },
            { result: 6 },
            { result: 'WMON' },
            { result: 'Wrapped Monad' },
            { result: 18 },
          ],
          isLoading: false,
          error: undefined,
        }
      }

      return { data: undefined, isLoading: false, error: undefined }
    })

    const { result } = renderHook(() =>
      usePoolData({
        poolIdOrAddress: '0xc2b6fb4647d27ba552e3d3c0c3a44414430a3a56',
        chainId: UniverseChainId.Kasane,
        isPoolAddress: true,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(false)
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.protocolVersion).toBe(GraphQLApi.ProtocolVersion.V2)
    expect(result.current.data?.token0.symbol).toBe('USDC')
    expect(result.current.data?.token1.symbol).toBe('WMON')
    expect(result.current.data?.tvlUSD).toBe(120000)
    expect(result.current.data?.volumeUSD24H).toBe(15000)
    expect(result.current.data?.feeTier?.feeAmount).toBe(30)
  })

  it('Kasane 以外はデータ取得しない', () => {
    const { result } = renderHook(() =>
      usePoolData({
        poolIdOrAddress: '0xc2b6fb4647d27ba552e3d3c0c3a44414430a3a56',
        chainId: UniverseChainId.Mainnet,
        isPoolAddress: true,
      }),
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})
