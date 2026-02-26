// This is just an array of the app's defined paths that can be used in our Cloudflare Functions.
// Do not add any imports to this file.
// The array is kept up to date via the tests in src/pages/paths.test.ts

export const paths = [
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
  '/positions/create',
  '/positions/create/:version',
  '/positions/v2/:chainName/:pairAddress',
  '/add/v2',
  '/remove/v2/:currencyIdA/:currencyIdB',
  '/portfolio',
  '/portfolio/tokens',
  '/portfolio/activity',
]
