import { PortfolioTab } from 'pages/Portfolio/types'
import { pathToPortfolioTab } from 'pages/Portfolio/utils/portfolioUrls'
import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getChainIdFromChainUrlParam, isChainUrlParam } from 'utils/chainParams'

export function usePortfolioRoutes(): {
  tab?: PortfolioTab
  chainName?: string
  chainId?: UniverseChainId
} {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get tab from pathname mapping
  const tab = pathToPortfolioTab(pathname) ?? PortfolioTab.Overview

  // Keep only tokens as the default portfolio surface.
  // /portfolio redirects to /portfolio/tokens, while unknown portfolio tabs fall through to route handling.
  useEffect(() => {
    if (tab === PortfolioTab.Overview) {
      const search = searchParams.toString()
      navigate(`/portfolio/tokens${search ? `?${search}` : ''}`, { replace: true })
    }
  }, [tab, navigate, searchParams])

  // Get chainName from query parameters
  const chainNameParam = searchParams.get('chain')
  const chainName = chainNameParam && isChainUrlParam(chainNameParam) ? chainNameParam : undefined
  const chainId = chainName ? getChainIdFromChainUrlParam(chainName) : undefined

  return { tab, chainName, chainId }
}
