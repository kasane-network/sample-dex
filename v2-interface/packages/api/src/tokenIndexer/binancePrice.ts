// where: @universe/api token indexer
// what: Fetches native token market stats from Binance public ticker endpoint
// why: Provide baseline USD price/change for Kasane native token when on-chain snapshots cannot price it directly

export interface BinanceNativeMarketStats {
  readonly priceUsd: number
  readonly priceChange1dPct: number
  readonly volume24hUsd: number
}

function toFiniteNumber(input: string | undefined): number | null {
  if (!input) {
    return null
  }
  const parsed = Number.parseFloat(input)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed
}

export async function fetchBinanceNativeMarketStats(params: {
  readonly symbol: string
  readonly fetchImpl?: typeof fetch
}): Promise<BinanceNativeMarketStats | null> {
  const fetchImpl = params.fetchImpl ?? fetch
  const symbol = params.symbol.trim().toUpperCase()
  if (!symbol) {
    return null
  }

  const response = await fetchImpl(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)
  if (!response.ok) {
    return null
  }

  const body: unknown = await response.json()
  if (typeof body !== 'object' || body === null) {
    return null
  }
  const lastPrice = 'lastPrice' in body && typeof body.lastPrice === 'string' ? body.lastPrice : undefined
  const priceChangePercent =
    'priceChangePercent' in body && typeof body.priceChangePercent === 'string' ? body.priceChangePercent : undefined
  const quoteVolume = 'quoteVolume' in body && typeof body.quoteVolume === 'string' ? body.quoteVolume : undefined

  const priceUsd = toFiniteNumber(lastPrice)
  const priceChange1dPct = toFiniteNumber(priceChangePercent)
  const volume24hUsd = toFiniteNumber(quoteVolume)

  if (priceUsd === null || priceChange1dPct === null || volume24hUsd === null) {
    return null
  }

  return {
    priceUsd,
    priceChange1dPct,
    volume24hUsd,
  }
}
