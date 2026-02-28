import Navbar from 'components/NavBar/index'
import { UkBanner, useRenderUkBanner } from 'components/TopLevelBanners/UkBanner'
import { useRenderUniswapWrapped2025Banner } from 'components/TopLevelBanners/UniswapWrapped2025Banner'
import { useAccount } from 'hooks/useAccount'
import { PageType, useIsPage } from 'hooks/useIsPage'
import { useScroll } from 'hooks/useScroll'
import useSelectChain from 'hooks/useSelectChain'
import { GRID_AREAS } from 'pages/App/utils/shared'
import { memo, useEffect, useRef } from 'react'
import { Flex } from 'ui/src'
import { zIndexes } from 'ui/src/theme'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { logger } from 'utilities/src/logger/logger'
// biome-ignore lint/style/noRestrictedImports: wagmi chain hook needed for wallet chain detection
import { useChainId as useChainIdWagmi } from 'wagmi'

export const Header = memo(function Header() {
  const { isScrolledDown } = useScroll()
  const account = useAccount()
  const connectedChainId = useChainIdWagmi()
  const selectChain = useSelectChain()
  const lastAutoSwitchAttemptRef = useRef<string | null>(null)
  const isPortfolioPage = useIsPage(PageType.PORTFOLIO)
  const isExplorePage = useIsPage(PageType.EXPLORE)
  const isHeaderTransparent = !isScrolledDown && !isPortfolioPage && !isExplorePage
  const navHasBottomBorder = isScrolledDown
  const renderUkBanner = useRenderUkBanner()
  const renderUniswapWrapped2025Banner = useRenderUniswapWrapped2025Banner()

  useEffect(() => {
    const currentChainId = account.chainId ?? connectedChainId

    if (!account.isConnected || !account.address) {
      logger.info('Header', 'useEffect', 'KasaneAutoSwitch skip not-connected', {
        isConnected: account.isConnected,
        hasAddress: Boolean(account.address),
      })
      lastAutoSwitchAttemptRef.current = null
      return
    }

    if (currentChainId === UniverseChainId.Kasane) {
      logger.info('Header', 'useEffect', 'KasaneAutoSwitch skip already-kasane', {
        chainId: currentChainId,
        address: account.address,
      })
      lastAutoSwitchAttemptRef.current = null
      return
    }

    const mismatchKey = `${account.address}:${currentChainId === undefined ? 'unknown' : String(currentChainId)}`
    if (lastAutoSwitchAttemptRef.current === mismatchKey) {
      logger.info('Header', 'useEffect', 'KasaneAutoSwitch skip duplicate-attempt', { mismatchKey })
      return
    }

    logger.info('Header', 'useEffect', 'KasaneAutoSwitch trigger', {
      fromChainId: currentChainId,
      toChainId: UniverseChainId.Kasane,
      address: account.address,
    })
    lastAutoSwitchAttemptRef.current = mismatchKey

    const autoSwitchToKasane = async (): Promise<void> => {
      const switched = await selectChain(UniverseChainId.Kasane)
      logger.info('Header', 'useEffect', 'KasaneAutoSwitch result', { switched, mismatchKey })
    }

    autoSwitchToKasane().catch((error: Error) => {
      logger.error(error, {
        tags: {
          file: 'Header.tsx',
          function: 'KasaneAutoSwitch',
        },
        extra: {
          mismatchKey,
        },
      })
    })
  }, [account.address, account.chainId, account.isConnected, connectedChainId, selectChain])

  return (
    <Flex
      id="AppHeader"
      $platform-web={{
        gridArea: GRID_AREAS.HEADER,
        position: 'sticky',
      }}
      className="webkitSticky"
      width="100vw"
      top={0}
      zIndex={zIndexes.header}
      pointerEvents="none"
    >
      <style>
        {`
          .webkitSticky {
            position: -webkit-sticky;
          }
        `}
      </style>
      <Flex position="relative" zIndex={zIndexes.sticky} pointerEvents="auto">
        {renderUkBanner && <UkBanner />}
        {renderUniswapWrapped2025Banner}
      </Flex>
      <Flex
        width="100%"
        backgroundColor={isHeaderTransparent ? 'transparent' : '$surface1'}
        borderBottomColor={navHasBottomBorder ? '$surface3' : 'transparent'}
        borderBottomWidth={1}
        pointerEvents="auto"
        transition="border-bottom-color 0.2s ease-in-out"
      >
        <Navbar />
      </Flex>
    </Flex>
  )
})
