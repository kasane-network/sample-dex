import { LoadingBubble } from 'components/Tokens/loading'
import { DeltaArrow } from 'components/Tokens/TokenDetails/Delta'
import { Fragment, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSupabaseTotalTvlQuery, useSupabaseTotalVolume24hQuery } from 'state/explore/useSupabaseExploreStatsQuery'
import { AnimatePresence, Flex, Text, useMedia } from 'ui/src'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { NumberType } from 'utilities/src/format/types'

interface ExploreStatSectionData {
  label: string
  value: string
  change: number
}

const ExploreStatsSection = ({
  shouldHideStats = false,
  chainId = UniverseChainId.Kasane,
}: {
  shouldHideStats?: boolean
  chainId?: UniverseChainId
}) => {
  const media = useMedia()
  const { t } = useTranslation()
  const { convertFiatAmountFormatted } = useLocalizationContext()

  const { data: supabaseTotalVolume24h, isLoading: isSupabaseTotalVolume24hLoading } = useSupabaseTotalVolume24hQuery({
    chainId,
    enabled: true,
  })
  const { data: supabaseTotalTvl, isLoading: isSupabaseTotalTvlLoading } = useSupabaseTotalTvlQuery({
    chainId,
    enabled: true,
  })

  const isStatDataLoading = isSupabaseTotalVolume24hLoading || isSupabaseTotalTvlLoading

  const exploreStatsSectionData = useMemo(() => {
    const formatPrice = (price: number) => convertFiatAmountFormatted(price, NumberType.FiatTokenPrice)

    const stats = [
      {
        label: t('stats.volume.1d.long'),
        value: formatPrice(supabaseTotalVolume24h ?? 0),
        change: 0,
      },
      {
        label: 'Total Kasane TVL',
        value: formatPrice(supabaseTotalTvl ?? 0),
        change: 0,
      },
    ]

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return stats.filter((state): state is Exclude<typeof state, null> => state !== null)
  }, [
    t,
    convertFiatAmountFormatted,
    supabaseTotalVolume24h,
    supabaseTotalTvl,
  ])

  const visibleStats = media.md ? exploreStatsSectionData.slice(0, 2) : exploreStatsSectionData

  return (
    <AnimatePresence>
      {!shouldHideStats && (
        <Flex
          row
          width="100%"
          key="explore-stats"
          animation="300ms"
          enterStyle={{ opacity: 0, y: -10 }}
          exitStyle={{ opacity: 0, y: -10 }}
          transition="opacity 0.3s ease, transform 0.3s ease"
        >
          {visibleStats.map((data, index) => (
            <Flex
              key={data.label}
              borderLeftWidth={index === 0 ? 0 : '$spacing1'}
              borderColor="$surface3"
              pl={index === 0 ? 0 : '$spacing24'}
              flex={1}
              cursor="default"
              transition="opacity 0.3s ease, transform 0.3s ease"
            >
              <StatDisplay data={data} isLoading={isStatDataLoading} />
            </Flex>
          ))}
        </Flex>
      )}
    </AnimatePresence>
  )
}

export default ExploreStatsSection

interface StatDisplayProps {
  data: ExploreStatSectionData
  isLoading?: boolean
  isHoverable?: boolean
}

const StatDisplay = memo(({ data, isLoading, isHoverable }: StatDisplayProps) => {
  const { formatPercent } = useLocalizationContext()
  const { t } = useTranslation()

  return (
    <Flex transition="all 0.1s ease-in-out" group gap="$spacing4" minHeight="$spacing60">
      <Text variant="body4" color="$neutral2" $group-hover={{ color: isHoverable ? '$neutral2Hovered' : '$neutral2' }}>
        {data.label}
      </Text>
      {isLoading ? (
        <LoadingBubble height="24px" width="80px" />
      ) : (
        <Text variant="subheading1" color="$neutral1">
          {data.value}
        </Text>
      )}
      <Flex row alignItems="center" gap="$spacing2" style={{ fontSize: 12 }} minHeight="$spacing16">
        {isLoading ? (
          <LoadingBubble height="12px" width="60px" />
        ) : (
          <Fragment>
            <DeltaArrow delta={data.change} formattedDelta={formatPercent(Math.abs(data.change))} size={12} />
            <Text variant="body4" color="$neutral1">
              {formatPercent(Math.abs(data.change))} {t('common.today').toLocaleLowerCase()}
            </Text>
          </Fragment>
        )}
      </Flex>
    </Flex>
  )
})

StatDisplay.displayName = 'StatDisplay'
