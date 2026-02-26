import { FeatureFlags, useFeatureFlag } from '@universe/gating'
import { getAddLiquidityPageTitle, getPositionPageDescription, getPositionPageTitle } from 'pages/getPositionPageTitle'
import { lazy, ReactNode, Suspense, useMemo } from 'react'
import { matchPath, Navigate, useLocation } from 'react-router'
import i18n from 'uniswap/src/i18n'
import { isBrowserRouterEnabled } from 'utils/env'

const AddLiquidityV2WithTokenRedirects = lazy(() => import('pages/AddLiquidityV2/redirects'))
const CreatePosition = lazy(() => import('pages/CreatePosition'))
const ExploreRedirects = lazy(() => import('pages/Explore/redirects'))
const PoolDetails = lazy(() => import('pages/PoolDetails'))
const Portfolio = lazy(() => import('pages/Portfolio/Portfolio'))
const PositionV2Page = lazy(() => import('pages/Positions/V2PositionPage'))
const Positions = lazy(() => import('pages/Positions'))
const NotFound = lazy(() => import('pages/NotFound'))
const Swap = lazy(() => import('pages/Swap'))
const TokenDetails = lazy(() => import('pages/TokenDetails'))

interface RouterConfig {
  browserRouterEnabled?: boolean
  hash?: string
  isPortfolioPageEnabled?: boolean
  isToucanEnabled?: boolean
}

/**
 * Convenience hook which organizes the router configuration into a single object.
 */
export function useRouterConfig(): RouterConfig {
  const browserRouterEnabled = isBrowserRouterEnabled()
  const { hash } = useLocation()
  const isPortfolioPageEnabled = useFeatureFlag(FeatureFlags.PortfolioPage)
  const isToucanEnabled = useFeatureFlag(FeatureFlags.Toucan)

  return useMemo(
    () => ({
      browserRouterEnabled,
      hash,
      isPortfolioPageEnabled,
      isToucanEnabled,
    }),
    [browserRouterEnabled, hash, isPortfolioPageEnabled, isToucanEnabled],
  )
}

// SEO titles and descriptions sourced from https://docs.google.com/spreadsheets/d/1_6vSxGgmsx6QGEZ4mdHppv1VkuiJEro3Y_IopxUHGB4/edit#gid=0
// getTitle and getDescription are used as static metatags for SEO. Dynamic metatags should be set in the page component itself
const StaticTitlesAndDescriptions = {
  UniswapTitle: 'Kasane Interface',
  SwapDescription: i18n.t('title.swappingMadeSimple'),
  DetailsPageBaseTitle: i18n.t('common.buyAndSell'),
  TDPDescription: i18n.t('title.realTime'),
  PDPDescription: i18n.t('title.tradeTokens'),
  AddLiquidityDescription: i18n.t('title.earnFees'),
  // TODO(LP-295): Update after launch
  ToucanPlaceholderDescription: 'Placeholder description for Toucan page',
}

export interface RouteDefinition {
  path: string
  nestedPaths: string[]
  getTitle: (path?: string) => string
  getDescription: (path?: string) => string
  enabled: (args: RouterConfig) => boolean
  getElement: (args: RouterConfig) => ReactNode
}

// Assigns the defaults to the route definition.
function createRouteDefinition(route: Partial<RouteDefinition>): RouteDefinition {
  return {
    getElement: () => null,
    getTitle: () => StaticTitlesAndDescriptions.UniswapTitle,
    getDescription: () => StaticTitlesAndDescriptions.SwapDescription,
    enabled: () => true,
    path: '/',
    nestedPaths: [],
    // overwrite the defaults
    ...route,
  }
}

export const routes: RouteDefinition[] = [
  createRouteDefinition({
    path: '/',
    getElement: () => (
      <Suspense fallback={null}>
        <Swap />
      </Suspense>
    ),
    getTitle: () => 'Kasane Interface',
    getDescription: () => StaticTitlesAndDescriptions.SwapDescription,
  }),
  createRouteDefinition({
    path: '/explore',
    nestedPaths: [':tab', ':chainName', ':tab/:chainName'],
    getElement: () => (
      <Suspense fallback={null}>
        <ExploreRedirects />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/explore/tokens/:chainName/:tokenAddress',
    getElement: () => (
      <Suspense fallback={null}>
        <TokenDetails />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/tokens',
    getElement: () => (
      <Suspense fallback={null}>
        <ExploreRedirects />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/tokens/:chainName',
    getElement: () => (
      <Suspense fallback={null}>
        <ExploreRedirects />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/tokens/:chainName/:tokenAddress',
    getElement: () => (
      <Suspense fallback={null}>
        <ExploreRedirects />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/explore/pools/:chainName/:poolAddress',
    getElement: () => (
      <Suspense fallback={null}>
        <PoolDetails />
      </Suspense>
    ),
  }),
  createRouteDefinition({
    path: '/explore/auctions/:chainName/:id',
    getElement: () => <Navigate to="/explore/auctions" replace />,
  }),
  createRouteDefinition({
    path: '/swap',
    getElement: () => (
      <Suspense fallback={null}>
        <Swap />
      </Suspense>
    ),
    getTitle: () => 'Kasane Interface',
    getDescription: () => StaticTitlesAndDescriptions.SwapDescription,
  }),
  // Refreshed pool routes
  createRouteDefinition({
    path: '/positions',
    getElement: () => (
      <Suspense fallback={null}>
        <Positions />
      </Suspense>
    ),
    getTitle: getPositionPageTitle,
    getDescription: getPositionPageDescription,
  }),
  createRouteDefinition({
    path: '/positions/v2/:chainName/:pairAddress',
    getElement: () => (
      <Suspense fallback={null}>
        <PositionV2Page />
      </Suspense>
    ),
    getTitle: getPositionPageTitle,
    getDescription: getPositionPageDescription,
  }),
  createRouteDefinition({
    path: '/positions/create',
    nestedPaths: [':version'],
    getElement: () => (
      <Suspense fallback={null}>
        <CreatePosition />
      </Suspense>
    ),
    getTitle: getPositionPageTitle,
    getDescription: getPositionPageDescription,
  }),
  createRouteDefinition({
    path: '/add/v2',
    nestedPaths: [':currencyIdA', ':currencyIdA/:currencyIdB'],
    getElement: () => (
      <Suspense fallback={null}>
        <AddLiquidityV2WithTokenRedirects />
      </Suspense>
    ),
    getTitle: getAddLiquidityPageTitle,
    getDescription: () => StaticTitlesAndDescriptions.AddLiquidityDescription,
  }),
  createRouteDefinition({
    path: '/remove/v2/:currencyIdA/:currencyIdB',
    getElement: () => <Navigate to="/swap" replace />,
    getTitle: () => i18n.t('title.removeLiquidityv2'),
    getDescription: () => i18n.t('title.removeTokensv2'),
  }),
  // Portfolio Pages
  createRouteDefinition({
    path: '/portfolio',
    nestedPaths: ['tokens', 'activity'],
    getElement: ({ isPortfolioPageEnabled }) =>
      isPortfolioPageEnabled ? (
        <Suspense fallback={null}>
          <Portfolio />
        </Suspense>
      ) : (
        <Navigate to="/swap" replace />
      ),
  }),
  createRouteDefinition({ path: '*', getElement: () => <Navigate to="/not-found" replace /> }),
  createRouteDefinition({ path: '/not-found', getElement: () => <NotFound /> }),
]

export const findRouteByPath = (pathname: string) => {
  for (const route of routes) {
    const match = matchPath(route.path, pathname)
    if (match) {
      return route
    }
    const subPaths = route.nestedPaths.map((nestedPath) => `${route.path}/${nestedPath}`)
    for (const subPath of subPaths) {
      const match = matchPath(subPath, pathname)
      if (match) {
        return route
      }
    }
  }
  return undefined
}
