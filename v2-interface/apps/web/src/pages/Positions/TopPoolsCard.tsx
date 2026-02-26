import { gqlToCurrency, unwrapToken } from 'dataLayer/data/util'
import { LiquidityPositionInfoBadges } from 'components/Liquidity/LiquidityPositionInfoBadges'
import { LPIncentiveRewardsBadge } from 'components/Liquidity/LPIncentives/LPIncentiveRewardsBadge'
import { DoubleCurrencyLogo } from 'components/Logo/DoubleLogo'
import { Trans } from 'react-i18next'
import { PoolStat } from 'state/explore/types'
import { Flex, Text } from 'ui/src'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { fromGraphQLChain } from 'uniswap/src/features/chains/utils'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { getChainUrlParam } from 'utils/chainParams'

function formatPoolApr(apr: unknown, formatPercent: (value: string | number) => string): string {
  if (typeof apr === 'number' || typeof apr === 'string') {
    return formatPercent(apr)
  }

  if (typeof apr === 'object' && apr !== null) {
    const toSignificant = Reflect.get(apr, 'toSignificant')
    if (typeof toSignificant === 'function') {
      const value = toSignificant.call(apr, 3)
      if (typeof value === 'string' || typeof value === 'number') {
        return formatPercent(value)
      }
    }

    const toFixed = Reflect.get(apr, 'toFixed')
    if (typeof toFixed === 'function') {
      const value = toFixed.call(apr, 3)
      if (typeof value === 'string' || typeof value === 'number') {
        return formatPercent(value)
      }
    }
  }

  return formatPercent(0)
}

export function TopPoolsCard({ pool }: { pool: PoolStat }) {
  const { defaultChainId } = useEnabledChains()
  const { formatPercent } = useLocalizationContext()

  const chainId = fromGraphQLChain(pool.chain) ?? defaultChainId
  const chainUrlParam = getChainUrlParam(chainId)
  const token0 = pool.token0 ? gqlToCurrency(unwrapToken(chainId, pool.token0)) : undefined
  const token1 = pool.token1 ? gqlToCurrency(unwrapToken(chainId, pool.token1)) : undefined

  const formattedApr = pool.boostedApr ? formatPercent(pool.boostedApr) : null
  const baseApr = formatPoolApr(pool.apr, formatPercent)

  return (
    <Flex
      row
      p="$padding16"
      borderRadius="$rounded20"
      borderColor="$surface3"
      borderWidth="$spacing1"
      justifyContent="space-between"
      cursor="pointer"
      hoverStyle={{ backgroundColor: '$surface1Hovered', borderColor: '$surface3Hovered' }}
      tag="a"
      href={`/explore/pools/${chainUrlParam}/${pool.id}`}
      $platform-web={{
        textDecoration: 'none',
      }}
    >
      <Flex row gap="$gap16">
        <DoubleCurrencyLogo currencies={[token0, token1]} size={44} />
        <Flex gap="$gap4">
          <Text variant="subheading2">
            {token0?.symbol} / {token1?.symbol}
          </Text>
          <Flex row gap="$spacing2" alignItems="center">
            <LiquidityPositionInfoBadges size="small" version={pool.protocolVersion} feeTier={pool.feeTier} />
          </Flex>
        </Flex>
      </Flex>
      <Flex alignItems="flex-end" gap="$gap4">
        <Text variant="body2" color="$neutral2">
          {baseApr} <Trans i18nKey="pool.apr" />
        </Text>
        {formattedApr && <LPIncentiveRewardsBadge formattedRewardApr={formattedApr} />}
      </Flex>
    </Flex>
  )
}
