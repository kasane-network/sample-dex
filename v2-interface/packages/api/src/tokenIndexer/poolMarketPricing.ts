export interface PoolMarketPricingInput {
  readonly token0Address: string
  readonly token1Address: string
  readonly reserve0: number
  readonly reserve1: number
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0
}

export function deriveTokenPricesFromPools(params: {
  readonly pools: readonly PoolMarketPricingInput[]
  readonly stableTokenAddresses: readonly string[]
  readonly seedTokenPricesUsd?: ReadonlyMap<string, number>
  readonly maxIterations?: number
}): Map<string, number> {
  const prices = new Map<string, number>()

  for (const stableTokenAddress of params.stableTokenAddresses) {
    prices.set(normalizeAddress(stableTokenAddress), 1)
  }

  if (params.seedTokenPricesUsd) {
    for (const [address, price] of params.seedTokenPricesUsd.entries()) {
      if (isPositiveFinite(price)) {
        prices.set(normalizeAddress(address), price)
      }
    }
  }

  const maxIterations = params.maxIterations ?? 8
  for (let i = 0; i < maxIterations; i++) {
    let updated = false

    for (const pool of params.pools) {
      if (!isPositiveFinite(pool.reserve0) || !isPositiveFinite(pool.reserve1)) {
        continue
      }

      const token0Address = normalizeAddress(pool.token0Address)
      const token1Address = normalizeAddress(pool.token1Address)
      const token0Price = prices.get(token0Address)
      const token1Price = prices.get(token1Address)

      if (isPositiveFinite(token0Price) && !isPositiveFinite(token1Price)) {
        prices.set(token1Address, (token0Price * pool.reserve0) / pool.reserve1)
        updated = true
        continue
      }

      if (isPositiveFinite(token1Price) && !isPositiveFinite(token0Price)) {
        prices.set(token0Address, (token1Price * pool.reserve1) / pool.reserve0)
        updated = true
      }
    }

    if (!updated) {
      break
    }
  }

  return prices
}

export function estimatePoolTvlUsd(params: {
  readonly reserve0: number
  readonly reserve1: number
  readonly token0PriceUsd?: number
  readonly token1PriceUsd?: number
}): number {
  if (!isPositiveFinite(params.reserve0) || !isPositiveFinite(params.reserve1)) {
    return 0
  }

  const token0Price = isPositiveFinite(params.token0PriceUsd) ? params.token0PriceUsd : undefined
  const token1Price = isPositiveFinite(params.token1PriceUsd) ? params.token1PriceUsd : undefined

  if (token0Price && token1Price) {
    return params.reserve0 * token0Price + params.reserve1 * token1Price
  }
  if (token0Price) {
    return params.reserve0 * token0Price * 2
  }
  if (token1Price) {
    return params.reserve1 * token1Price * 2
  }

  return 0
}
