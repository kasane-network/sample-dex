import {
  TokenListSource,
  TokenListToken,
  TokenOverrides,
  TokenRegistryRecord,
} from '@universe/api/src/tokenIndexer/types'

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase()
}

function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildSourceRank(sourceName: string): number {
  const normalized = sourceName.toLowerCase()
  if (normalized.includes('official')) {
    return 300
  }
  if (normalized.includes('default')) {
    return 200
  }
  return 100
}

function choosePrimarySource(currentSource: string, nextSource: string): string {
  return buildSourceRank(nextSource) > buildSourceRank(currentSource) ? nextSource : currentSource
}

function mergeToken(base: TokenListToken, candidate: TokenListToken): TokenListToken {
  const symbol = base.symbol.length >= candidate.symbol.length ? base.symbol : candidate.symbol
  const name = base.name.length >= candidate.name.length ? base.name : candidate.name
  const logoURI = base.logoURI ?? candidate.logoURI

  return {
    chainId: base.chainId,
    address: base.address,
    symbol,
    name,
    decimals: base.decimals,
    logoURI,
  }
}

export function buildSearchText(params: {
  readonly symbol: string
  readonly name: string
  readonly address: string
}): string {
  const chunks = [params.symbol, params.name, params.address].map(normalizeText).filter((chunk) => chunk.length > 0)

  return chunks.join(' ')
}

export function normalizeTokenRegistry(params: {
  readonly chainId: number
  readonly sources: readonly TokenListSource[]
  readonly overridesByAddress?: ReadonlyMap<string, TokenOverrides>
  readonly updatedAtIso: string
}): TokenRegistryRecord[] {
  const deduped = new Map<string, { token: TokenListToken; sourcePrimary: string }>()

  for (const source of params.sources) {
    for (const token of source.tokens) {
      if (token.chainId !== params.chainId || token.address.trim() === '') {
        continue
      }

      const normalizedAddress = normalizeAddress(token.address)
      const key = `${params.chainId}:${normalizedAddress}`
      const existing = deduped.get(key)
      const normalizedToken: TokenListToken = {
        ...token,
        address: normalizedAddress,
      }

      if (!existing) {
        deduped.set(key, { token: normalizedToken, sourcePrimary: source.sourceName })
        continue
      }

      deduped.set(key, {
        token: mergeToken(existing.token, normalizedToken),
        sourcePrimary: choosePrimarySource(existing.sourcePrimary, source.sourceName),
      })
    }
  }

  const records: TokenRegistryRecord[] = []

  for (const entry of deduped.values()) {
    const override = params.overridesByAddress?.get(entry.token.address)

    records.push({
      chainId: params.chainId,
      address: entry.token.address,
      symbol: entry.token.symbol,
      name: entry.token.name,
      decimals: entry.token.decimals,
      logoUri: entry.token.logoURI ?? null,
      verified: override?.verified ?? false,
      isSpam: override?.isSpam ?? false,
      priority: override?.priority ?? 0,
      sourcePrimary: entry.sourcePrimary,
      updatedAt: params.updatedAtIso,
    })
  }

  records.sort((a, b) => a.symbol.localeCompare(b.symbol))

  return records
}
