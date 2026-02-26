import { renderHook } from '@testing-library/react'
import { MatchType, PageType, useIsPage } from 'hooks/useIsPage'
import { BrowserRouter } from 'react-router'

describe('useIsPage', () => {
  it.each([
    [PageType.EXPLORE, '/explore/details'],
    [PageType.LANDING, '/'],
    [PageType.POSITIONS, '/positions'],
    [PageType.POSITIONS, '/positions/v2/ethereum/0x1'],
    [PageType.PORTFOLIO, '/portfolio/defi'],
    [PageType.SWAP, '/swap/'],
    [PageType.SWAP, '/swap//'],
  ])('matches default behavior for %s based on path %s', (pageType, path) => {
    window.history.pushState({}, '', path)
    const { result } = renderHook(() => useIsPage(pageType), {
      wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    })
    expect(result.current).toBe(true)
  })

  it.each([
    [PageType.SWAP, '/swap/details', MatchType.STARTS_WITH],
    [PageType.POSITIONS, '/view/positions', MatchType.INCLUDES],
    [PageType.PORTFOLIO, '/portfolio', MatchType.EXACT],
    // eslint-disable-next-line max-params
  ])('overrides default MatchType for %s when custom MatchType %s is provided', (pageType, path, matchType) => {
    window.history.pushState({}, '', path)
    const { result } = renderHook(() => useIsPage(pageType, matchType), {
      wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    })
    expect(result.current).toBe(true)
  })

  it.each([
    [PageType.SWAP, '/different/swap/location'],
    [PageType.POSITIONS, '/incorrect/position'],
  ])('does not match default behavior for %s with path %s', (pageType, path) => {
    window.history.pushState({}, '', path)
    const { result } = renderHook(() => useIsPage(pageType), {
      wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    })
    expect(result.current).toBe(false)
  })
})
