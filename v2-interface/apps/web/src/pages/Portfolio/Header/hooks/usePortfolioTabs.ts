import { useTranslation } from 'react-i18next'
import { InterfacePageName } from 'uniswap/src/features/telemetry/constants'

export type PortfolioTabInfo = {
  path: string
  pageName: InterfacePageName
  label: string
}

export function usePortfolioTabs(): PortfolioTabInfo[] {
  const { t } = useTranslation()
  return [{ path: '/portfolio/tokens', pageName: InterfacePageName.PortfolioTokensPage, label: t('portfolio.tokens.title') }]
}
