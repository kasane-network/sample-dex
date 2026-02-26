import { SwapV2 } from 'components/Icons/SwapV2'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { useSporeColors } from 'ui/src'
import { CoinConvert } from 'ui/src/components/icons/CoinConvert'
import { ElementName } from 'uniswap/src/features/telemetry/constants'

export type TabsSection = {
  title: string
  href: string
  isActive?: boolean
  items?: TabsItem[]
  closeMenu?: () => void
  icon?: JSX.Element
}

export type TabsItem = MenuItem & {
  icon?: JSX.Element
  elementName?: ElementName
}

type MenuItem = {
  label: string
  href: string
  internal?: boolean
  overflow?: boolean
  closeMenu?: () => void
}

export const useTabsContent = (): TabsSection[] => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const colors = useSporeColors()

  return [
    {
      title: t('common.trade'),
      href: '/swap',
      isActive: pathname.startsWith('/swap') || pathname.startsWith('/send'),
      icon: <CoinConvert color="$accent1" size="$icon.20" />,
      items: [
        {
          label: t('common.swap'),
          icon: <SwapV2 fill={colors.neutral2.val} />,
          href: '/swap',
          internal: true,
        },
      ],
    },
    {
      title: t('common.explore'),
      href: '/explore',
      isActive: pathname.startsWith('/explore') || pathname.startsWith('/tokens'),
    },
    {
      title: t('common.pool'),
      href: '/positions',
      isActive: pathname.startsWith('/positions') || pathname.startsWith('/add'),
    },
    {
      title: t('common.portfolio'),
      href: '/portfolio/tokens',
      isActive: pathname.startsWith('/portfolio'),
    },
  ]
}
