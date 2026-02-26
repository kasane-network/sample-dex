import fs from 'fs'
import { findRouteByPath, routes } from 'pages/RouteDefinitions'
import React from 'react'
import { parseStringPromise } from 'xml2js'

vi.mock('pages/Swap', () => ({
  default: () => React.createElement(React.Fragment),
}))

describe('Routes', () => {
  it('sitemap URLs should exist as Router paths', async () => {
    const contents = fs.readFileSync('./public/app-sitemap.xml', 'utf8')
    const sitemap = await parseStringPromise(contents)

    const sitemapPaths: string[] = sitemap.urlset.url.map((url: any) => new URL(url.loc).pathname)

    sitemapPaths
      .filter((p) => !p.includes('/0x'))
      .forEach((path: string) => {
        expect(findRouteByPath(path)).toBeDefined()
      })
  })

  it('router definition should match expected paths', () => {
    const routePaths = routes.map((route) => route.path)
    expect(routePaths).toEqual([
      '/',
      '/explore',
      '/explore/tokens/:chainName/:tokenAddress',
      '/tokens',
      '/tokens/:chainName',
      '/tokens/:chainName/:tokenAddress',
      '/explore/pools/:chainName/:poolAddress',
      '/explore/auctions/:chainName/:id',
      '/swap',
      '/positions',
      '/positions/v2/:chainName/:pairAddress',
      '/positions/create',
      '/add/v2',
      '/remove/v2/:currencyIdA/:currencyIdB',
      '/portfolio',
      '*',
      '/not-found',
    ])
  })
})
