import { useFeatureFlagUrlOverrides } from 'featureFlags/useFeatureFlagUrlOverrides'
import ErrorBoundary from 'components/ErrorBoundary'
import { AppLayout } from 'pages/App/Layout'
import { ResetPageScrollEffect } from 'pages/App/utils/ResetPageScroll'
import { UserPropertyUpdater } from 'pages/App/utils/UserPropertyUpdater'
import { useEffect, useLayoutEffect } from 'react'
import { Helmet } from 'react-helmet-async/lib/index'
import { Navigate, useLocation } from 'react-router'
import DarkModeQueryParamReader from 'theme/components/DarkModeQueryParamReader'
import { useSporeColors } from 'ui/src'
import { initializeScrollWatcher } from 'uniswap/src/components/modals/ScrollLock'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { isPathBlocked } from 'utils/blockedPaths'
import { MICROSITE_LINK } from 'utils/openDownloadApp'
import { getCurrentPageFromLocation } from 'utils/urlRoutes'

let hasInitializedScrollWatcher = false

export default function App() {
  const colors = useSporeColors()

  const location = useLocation()
  const { pathname } = location
  const currentPage = getCurrentPageFromLocation(pathname)

  useFeatureFlagUrlOverrides()

  useEffect(() => {
    if (hasInitializedScrollWatcher) {
      return
    }
    initializeScrollWatcher()
    hasInitializedScrollWatcher = true
  }, [])

  // redirect address to landing pages until implemented
  const shouldRedirectToAppInstall = pathname.startsWith('/address/')
  useLayoutEffect(() => {
    if (shouldRedirectToAppInstall) {
      window.location.href = MICROSITE_LINK
    }
  }, [shouldRedirectToAppInstall])

  if (shouldRedirectToAppInstall) {
    return null
  }

  const shouldBlockPath = isPathBlocked(pathname)
  if (shouldBlockPath && pathname !== '/swap') {
    return <Navigate to="/swap" replace />
  }

  return (
    <ErrorBoundary>
      <DarkModeQueryParamReader />
      <Trace page={currentPage}>
        {/*
          This is where *static* page titles are injected into the <head> tag. If you
          want to set a page title based on data that's dynamic or not available on first render,
          you can set it later in the page component itself, since react-helmet-async prefers the most recently rendered title.
        */}
        <Helmet>
          <style>{`
            html {
              ::-webkit-scrollbar-thumb {
                background-color: ${colors.surface3.val};
              }
              scrollbar-color: ${colors.surface3.val} ${colors.surface1.val};
            }
          `}</style>
        </Helmet>
        <UserPropertyUpdater />
        <ResetPageScrollEffect />
        <AppLayout />
      </Trace>
    </ErrorBoundary>
  )
}
