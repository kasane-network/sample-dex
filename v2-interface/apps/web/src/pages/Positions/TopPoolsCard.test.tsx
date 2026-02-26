import { Percent } from '@uniswap/sdk-core'
import { GraphQLApi } from '@universe/api'
import { TopPoolsCard } from 'pages/Positions/TopPoolsCard'
import { render, screen } from 'test-utils/render'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

vi.mock('components/Liquidity/LiquidityPositionInfoBadges', () => ({
  LiquidityPositionInfoBadges: () => <div>badges</div>,
}))

vi.mock('components/Liquidity/LPIncentives/LPIncentiveRewardsBadge', () => ({
  LPIncentiveRewardsBadge: () => <div>rewards</div>,
}))

vi.mock('components/Logo/DoubleLogo', () => ({
  DoubleCurrencyLogo: () => <div>logo</div>,
}))

vi.mock('dataLayer/data/util', () => ({
  unwrapToken: (_chainId: UniverseChainId, token: unknown) => token,
  gqlToCurrency: (_token: unknown) => undefined,
}))

vi.mock('uniswap/src/features/language/LocalizationContext', () => ({
  useLocalizationContext: () => ({
    formatPercent: (value: number | string) => `${value}%`,
  }),
}))

describe('TopPoolsCard', () => {
  it('Kasane pool links use kasane chain url param instead of monad_testnet', () => {
    render(
      <TopPoolsCard
        pool={{
          id: '0xc2b6fb4647d27ba552e3d3c0c3a44414430a3a56',
          chain: GraphQLApi.Chain.MonadTestnet,
          protocolVersion: GraphQLApi.ProtocolVersion.V2,
          token0: {
            address: '0x1',
            chain: GraphQLApi.Chain.MonadTestnet,
            symbol: 'AAA',
            name: 'AAA',
            decimals: 18,
          },
          token1: {
            address: '0x2',
            chain: GraphQLApi.Chain.MonadTestnet,
            symbol: 'BBB',
            name: 'BBB',
            decimals: 18,
          },
          apr: new Percent(0, 1),
          feeTier: {
            feeAmount: 3000,
            tickSpacing: 60,
            isDynamic: false,
          },
        }}
      />,
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/explore/pools/kasane/0xc2b6fb4647d27ba552e3d3c0c3a44414430a3a56')
  })
})
