import { TokenListSource, TokenListToken } from '@universe/api/src/tokenIndexer/types'

interface RawTokenListToken {
  readonly chainId: number
  readonly address: string
  readonly symbol: string
  readonly name: string
  readonly decimals: number
  readonly logoURI?: string
}

function isRawTokenListToken(candidate: unknown): candidate is RawTokenListToken {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }

  if (!('chainId' in candidate) || typeof candidate.chainId !== 'number') {
    return false
  }
  if (!('address' in candidate) || typeof candidate.address !== 'string') {
    return false
  }
  if (!('symbol' in candidate) || typeof candidate.symbol !== 'string') {
    return false
  }
  if (!('name' in candidate) || typeof candidate.name !== 'string') {
    return false
  }
  if (!('decimals' in candidate) || typeof candidate.decimals !== 'number') {
    return false
  }
  if ('logoURI' in candidate && typeof candidate.logoURI !== 'string' && candidate.logoURI !== undefined) {
    return false
  }

  return true
}

function parseToken(candidate: RawTokenListToken): TokenListToken | null {
  if (candidate.address.trim() === '' || candidate.symbol.trim() === '' || candidate.name.trim() === '') {
    return null
  }

  return {
    chainId: candidate.chainId,
    address: candidate.address,
    symbol: candidate.symbol,
    name: candidate.name,
    decimals: candidate.decimals,
    logoURI: candidate.logoURI,
  }
}

function parseSourceName(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url
  }
}

export async function fetchTokenListSources(params: {
  readonly tokenListUrls: readonly string[]
  readonly fetchImpl?: typeof fetch
}): Promise<TokenListSource[]> {
  const fetchImpl = params.fetchImpl ?? fetch
  const sources: TokenListSource[] = []

  for (const tokenListUrl of params.tokenListUrls) {
    const response = await fetchImpl(tokenListUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch token list ${tokenListUrl}: ${response.status}`)
    }

    const raw: unknown = await response.json()
    const rawTokens: unknown[] =
      typeof raw === 'object' && raw !== null && 'tokens' in raw && Array.isArray(raw.tokens) ? raw.tokens : []
    const tokens: TokenListToken[] = []

    for (const rawToken of rawTokens) {
      if (isRawTokenListToken(rawToken)) {
        const token = parseToken(rawToken)
        if (token) {
          tokens.push(token)
        }
      }
    }

    sources.push({
      sourceName: parseSourceName(tokenListUrl),
      tokens,
    })
  }

  return sources
}
