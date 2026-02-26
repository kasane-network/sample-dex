import userEvent from '@testing-library/user-event'
import PositionsPage from 'pages/Positions'
import { useAccount } from 'hooks/useAccount'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useSupabaseExploreStatsQuery } from 'state/explore/useSupabaseExploreStatsQuery'
import { useAppDispatch } from 'state/hooks'
import { useSupabaseUserV2PositionsQuery, UserV2PositionItem } from 'state/positions/useSupabaseUserV2PositionsQuery'
import { mocked } from 'test-utils/mocked'
import { render, screen } from 'test-utils/render'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { ReactNode } from 'react'

const mockDispatch = vi.fn()

vi.mock('hooks/useAccount')
vi.mock('state/explore/useSupabaseExploreStatsQuery')
vi.mock('state/positions/useSupabaseUserV2PositionsQuery')
vi.mock('state/hooks', () => ({
  useAppDispatch: vi.fn(),
}))

vi.mock('pages/Positions/TopPoolsCard', () => ({
  TopPoolsCard: () => <div>TopPool</div>,
}))
vi.mock('components/Dropdowns/AdaptiveDropdown', () => ({
  AdaptiveDropdown: ({
    trigger,
    isOpen,
    children,
  }: {
    trigger: ReactNode
    isOpen: boolean
    children: ReactNode
  }) => (
    <div>
      {trigger}
      {isOpen ? children : null}
    </div>
  ),
}))
vi.mock('uniswap/src/components/menus/ContextMenuContent', () => ({
  MenuContent: ({
    items,
    handleCloseMenu,
  }: {
    items: Array<{ label: string; onPress: () => void }>
    handleCloseMenu: () => void
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onPress()
            handleCloseMenu()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

function createPosition(pairAddress: string, token0Symbol: string, token1Symbol: string): UserV2PositionItem {
  return {
    chainId: UniverseChainId.Kasane,
    walletAddress: '0xabc',
    pairAddress,
    token0Address: '0x0000000000000000000000000000000000000001',
    token1Address: '0x0000000000000000000000000000000000000002',
    token0Symbol,
    token1Symbol,
    token0Decimals: 18,
    token1Decimals: 18,
    userAmount0Raw: '1000000000000000000',
    userAmount1Raw: '2000000000000000000',
    lpBalanceRaw: '1000000000000000000',
    poolShareRatio: 0.01,
    updatedAt: '2026-02-26T00:00:00.000Z',
  }
}

describe('PositionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocked(useAppDispatch).mockReturnValue(mockDispatch)

    mocked(useAccount).mockReturnValue({
      address: '0xabc',
      chainId: UniverseChainId.Kasane,
      connector: undefined,
      isConnected: true,
      isConnecting: false,
      isReconnecting: false,
      status: 'connected',
    })

    mocked(useSupabaseExploreStatsQuery).mockReturnValue({
      data: { stats: { poolStats: [] } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useSupabaseExploreStatsQuery>)

    mocked(useSupabaseUserV2PositionsQuery).mockReturnValue({
      data: [
        createPosition('0x1000000000000000000000000000000000000001', 'AAA', 'BBB'),
        createPosition('0x2000000000000000000000000000000000000002', 'CCC', 'DDD'),
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSupabaseUserV2PositionsQuery>)
  })

  it('各ポジションカードにメニューボタンが表示される', () => {
    render(<PositionsPage />)

    expect(screen.getByTestId('user-v2-position-menu-button-0x1000000000000000000000000000000000000001')).toBeVisible()
    expect(screen.getByTestId('user-v2-position-menu-button-0x2000000000000000000000000000000000000002')).toBeVisible()
  })

  it('メニューの「remove」から RemoveLiquidity モーダルを開く', async () => {
    render(<PositionsPage />)

    await userEvent.click(screen.getByTestId('user-v2-position-menu-button-0x2000000000000000000000000000000000000002'))
    await userEvent.click(screen.getByRole('button', { name: 'remove' }))

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          name: ModalName.RemoveLiquidity,
          initialState: expect.objectContaining({
            poolId: '0x2000000000000000000000000000000000000002',
            version: expect.any(Number),
          }),
        }),
      }),
    )
  })
})
