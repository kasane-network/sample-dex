// where: scripts/token-indexer registry normalization
// what: Normalize token list rows into stable token_registry records
// why: Keep dedupe and display fields deterministic across mixed list sources

import { getAddress } from 'viem'

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function buildSearchText({ symbol, name, address }) {
  return [normalizeText(symbol), normalizeText(name), address.toLowerCase()]
    .filter((part) => part.length > 0)
    .join(' ')
}

export function normalizeTokenRegistry({ chainId, sources, updatedAtIso, overridesByAddress }) {
  const byKey = new Map()

  for (const source of sources) {
    for (const token of source.tokens) {
      if (token.chainId !== chainId) {
        continue
      }
      if (typeof token.address !== 'string') {
        continue
      }
      if (typeof token.symbol !== 'string' || typeof token.name !== 'string') {
        continue
      }
      if (typeof token.decimals !== 'number') {
        continue
      }

      const normalizedAddress = getAddress(token.address).toLowerCase()
      const key = `${chainId}:${normalizedAddress}`
      const override = overridesByAddress?.get(normalizedAddress)

      const record = {
        chainId,
        address: normalizedAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoUri: typeof token.logoURI === 'string' ? token.logoURI : null,
        verified: override?.verified ?? false,
        isSpam: override?.isSpam ?? false,
        priority: override?.priority ?? 0,
        sourcePrimary: source.sourceName,
        updatedAt: updatedAtIso,
      }

      byKey.set(key, record)
    }
  }

  return [...byKey.values()]
}
