import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import PortfolioActivity from 'pages/Portfolio/Activity/Activity'
import { PortfolioDefi } from 'pages/Portfolio/Defi'
import { usePortfolioRoutes } from 'pages/Portfolio/Header/hooks/usePortfolioRoutes'
import { usePortfolioTabsAnimation } from 'pages/Portfolio/Header/hooks/usePortfolioTabsAnimation'
import { PortfolioTokens } from 'pages/Portfolio/Tokens/Tokens'
import { PortfolioTab } from 'pages/Portfolio/types'
import { useLocation } from 'react-router'
import { Flex } from 'ui/src'
import { TransitionItem } from 'ui/src/animations/components/AnimatePresencePager'

const renderPortfolioContent = (tab: PortfolioTab | undefined, isPortfolioDefiTabEnabled: boolean) => {
  switch (tab) {
    case PortfolioTab.Overview:
      return <PortfolioTokens />
    case PortfolioTab.Tokens:
      return <PortfolioTokens />
    case PortfolioTab.Defi:
      // Non-token tabs are redirected by usePortfolioRoutes.
      return isPortfolioDefiTabEnabled ? <PortfolioDefi /> : <PortfolioTokens />
    case PortfolioTab.Activity:
      return <PortfolioActivity />
    default:
      return <PortfolioTokens />
  }
}

export function PortfolioContent({ disabled }: { disabled?: boolean }): JSX.Element {
  const { pathname } = useLocation()
  const animationType = usePortfolioTabsAnimation(pathname)
  const { tab } = usePortfolioRoutes()
  const isPortfolioDefiTabEnabled = useFeatureFlag(FeatureFlags.PortfolioDefiTab)

  return (
    <Flex flex={1} position="relative" $platform-web={disabled ? { pointerEvents: 'none' } : undefined}>
      <TransitionItem childKey={pathname} animationType={animationType} animation="fast">
        {renderPortfolioContent(tab, isPortfolioDefiTabEnabled)}
      </TransitionItem>
    </Flex>
  )
}
