// where: scripts/token-indexer token list fetcher
// what: Fetch one or more token list JSON documents over HTTP(S)
// why: Build deterministic token registry input from explicit list sources

function parseTokenListPayload(url, payload) {
  if (typeof payload !== 'object' || payload === null || !Array.isArray(payload.tokens)) {
    throw new Error(`Invalid token list payload: ${url}`)
  }

  return payload.tokens
    .filter((token) => typeof token === 'object' && token !== null)
    .map((token) => ({
      chainId: token.chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    }))
}

export async function fetchTokenListSources({ tokenListUrls, fetchImpl = fetch }) {
  const sources = []

  for (const url of tokenListUrls) {
    const response = await fetchImpl(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${url} status=${response.status}`)
    }

    const payload = await response.json()
    sources.push({
      sourceName: url,
      tokens: parseTokenListPayload(url, payload),
    })
  }

  return sources
}
