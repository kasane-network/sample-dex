import { Token } from '@uniswap/sdk-core'
import { renderHook } from '@testing-library/react'
import { useAccount } from 'hooks/useAccount'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { logger } from 'utilities/src/logger/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBalance, useReadContracts } from 'wagmi'

import { useCurrencyBalances } from 'lib/hooks/useCurrencyBalance'

vi.mock('hooks/useAccount', () => ({
  useAccount: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useBalance: vi.fn(),
  useReadContracts: vi.fn(),
}))

vi.mock('utilities/src/logger/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}))

const ACCOUNT = '0x909D57e94B8f385Ce9389d6B88Dc6dec6fb5F7C0'
const KASANE_TOKEN = new Token(
  UniverseChainId.Kasane,
  '0x1111111111111111111111111111111111111111',
  18,
  'KAS',
  'Kasane Token',
)
const MAINNET_TOKEN = new Token(
  UniverseChainId.Mainnet,
  '0x2222222222222222222222222222222222222222',
  18,
  'ETHX',
  'Mainnet Token',
)

describe('useCurrencyBalances (Kasane-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useReadContracts).mockReturnValue({
      data: [{ result: 123n }],
      isLoading: false,
    })
    vi.mocked(useBalance).mockReturnValue({
      data: undefined,
    })
  })

  it('logs warning when connected chain is non-Kasane', () => {
    vi.mocked(useAccount).mockReturnValue({ chainId: UniverseChainId.Mainnet })

    const { result } = renderHook(() => useCurrencyBalances(ACCOUNT, [KASANE_TOKEN]))

    expect(result.current[0]?.quotient.toString()).toBe('123')
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      'useCurrencyBalance',
      'useRpcCurrencyBalances',
      'Non-Kasane chain connected in Kasane-only build',
      expect.objectContaining({
        account: ACCOUNT,
        connectedChainId: UniverseChainId.Mainnet,
      }),
    )
  })

  it('does not log warning when connected chain is Kasane', () => {
    vi.mocked(useAccount).mockReturnValue({ chainId: UniverseChainId.Kasane })

    renderHook(() => useCurrencyBalances(ACCOUNT, [KASANE_TOKEN]))

    expect(vi.mocked(logger.warn)).not.toHaveBeenCalledWith(
      'useCurrencyBalance',
      'useRpcCurrencyBalances',
      'Non-Kasane chain connected in Kasane-only build',
      expect.anything(),
    )
  })

  it('returns undefined for non-Kasane currencies', () => {
    vi.mocked(useAccount).mockReturnValue({ chainId: UniverseChainId.Kasane })

    const { result } = renderHook(() => useCurrencyBalances(ACCOUNT, [KASANE_TOKEN, MAINNET_TOKEN]))

    expect(result.current[0]?.quotient.toString()).toBe('123')
    expect(result.current[1]).toBeUndefined()
  })
})
