import { renderHook } from '@testing-library/react'
import { PopupType } from 'components/Popups/types'
import { EVMUniverseChainId, UniverseChainId } from 'uniswap/src/features/chains/types'
import { UserRejectedRequestError } from 'viem'
import useSelectChain from './useSelectChain'

type AccountLike = {
  chainId?: number
  isConnected: boolean
  connector?: { name?: string; id?: string }
}

type SwitchChainCallbacks = {
  onSettled: (_data: unknown, error: unknown) => void
}

type SwitchChainFn = (args: { chainId: EVMUniverseChainId }, callbacks: SwitchChainCallbacks) => void

const { mockUseAccount, mockUseIsSupportedChainIdCallback, mockSwitchChain, mockWagmiChains, mockAddPopup } =
  vi.hoisted(() => {
    return {
      mockUseAccount: vi.fn<() => AccountLike>(),
      mockUseIsSupportedChainIdCallback: vi.fn<() => (chainId?: number) => boolean>(),
      mockSwitchChain: vi.fn<SwitchChainFn>(),
      mockWagmiChains: vi.fn<() => Array<{ id: number }>>(),
      mockAddPopup: vi.fn(),
    }
  })

vi.mock('hooks/useAccount', () => ({
  useAccount: () => mockUseAccount(),
}))

vi.mock('uniswap/src/features/chains/hooks/useSupportedChainId', () => ({
  useIsSupportedChainIdCallback: () => mockUseIsSupportedChainIdCallback(),
}))

vi.mock('wagmi', () => ({
  useSwitchChain: () => ({
    switchChain: mockSwitchChain,
    chains: mockWagmiChains(),
  }),
}))

vi.mock('utilities/src/react/hooks', () => ({
  useEvent: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
}))

vi.mock('components/Popups/registry', () => ({
  popupRegistry: {
    addPopup: mockAddPopup,
  },
}))

vi.mock('utilities/src/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('ui/src/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ui/src/assets')>()
  return {
    ...actual,
    ICP_LOGO: 'icp-logo.png',
  }
})

describe('useSelectChain safety properties', () => {
  beforeEach(() => {
    mockSwitchChain.mockReset()
    mockUseAccount.mockReset()
    mockUseIsSupportedChainIdCallback.mockReset()
    mockWagmiChains.mockReset()
    mockAddPopup.mockReset()

    mockUseAccount.mockReturnValue({
      chainId: UniverseChainId.Mainnet,
      isConnected: true,
      connector: { name: 'Mock Wallet', id: 'mock-wallet' },
    })
    mockUseIsSupportedChainIdCallback.mockReturnValue(() => true)
    mockWagmiChains.mockReturnValue([{ id: UniverseChainId.Mainnet }, { id: UniverseChainId.Kasane }])
    mockSwitchChain.mockImplementation((_args, callbacks) => {
      callbacks.onSettled(undefined, undefined)
    })
  })

  it('returns true for SVM target and never switches chain', async () => {
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Solana)

    expect(switched).toBe(true)
    expect(mockSwitchChain).not.toHaveBeenCalled()
  })

  it('returns false for chains unsupported by both enabled-chains and wagmi config', async () => {
    mockUseIsSupportedChainIdCallback.mockReturnValue(() => false)
    mockWagmiChains.mockReturnValue([{ id: UniverseChainId.Mainnet }])
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Kasane)

    expect(switched).toBe(false)
    expect(mockSwitchChain).not.toHaveBeenCalled()
  })

  it('continues switch when chain is unsupported by enabled-chains but supported by wagmi', async () => {
    mockUseIsSupportedChainIdCallback.mockReturnValue(() => false)
    mockWagmiChains.mockReturnValue([{ id: UniverseChainId.Mainnet }, { id: UniverseChainId.Kasane }])
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Kasane)

    expect(switched).toBe(true)
    expect(mockSwitchChain).toHaveBeenCalledTimes(1)
  })

  it('returns true without calling switch when already on target chain', async () => {
    mockUseAccount.mockReturnValue({
      chainId: UniverseChainId.Kasane,
      isConnected: true,
      connector: { name: 'Mock Wallet', id: 'mock-wallet' },
    })
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Kasane)

    expect(switched).toBe(true)
    expect(mockSwitchChain).not.toHaveBeenCalled()
  })

  it('returns false and shows popup on generic switch failure', async () => {
    mockSwitchChain.mockImplementation((_args, callbacks) => {
      callbacks.onSettled(undefined, new Error('boom'))
    })
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Kasane)

    expect(switched).toBe(false)
    expect(mockAddPopup).toHaveBeenCalledWith(
      { failedSwitchNetwork: UniverseChainId.Kasane, type: PopupType.FailedSwitchNetwork },
      'failed-network-switch',
    )
  })

  it('returns false and does not show popup on user rejection', async () => {
    mockSwitchChain.mockImplementation((_args, callbacks) => {
      callbacks.onSettled(undefined, new UserRejectedRequestError(new Error('rejected')))
    })
    const { result } = renderHook(() => useSelectChain())

    const switched = await result.current(UniverseChainId.Kasane)

    expect(switched).toBe(false)
    expect(mockAddPopup).not.toHaveBeenCalled()
  })
})
