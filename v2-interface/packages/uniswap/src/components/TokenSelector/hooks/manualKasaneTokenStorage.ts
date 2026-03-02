import { getAddress } from '@ethersproject/address'
import { isWebPlatform } from 'utilities/src/platform'

const MANUAL_KASANE_TOKEN_ADDRESSES_KEY = 'manual-kasane-token-addresses-v1'

function canUseLocalStorage(): boolean {
  return isWebPlatform && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function normalizeKasaneTokenAddress(address: string | null | undefined): Address | undefined {
  if (!address) {
    return undefined
  }

  try {
    return getAddress(address)
  } catch (_error) {
    return undefined
  }
}

export function getManualKasaneTokenAddresses(): Address[] {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(MANUAL_KASANE_TOKEN_ADDRESSES_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) {
      return []
    }

    const dedupedAddresses = new Set<Address>()
    for (const value of parsedValue) {
      if (typeof value !== 'string') {
        continue
      }

      const normalized = normalizeKasaneTokenAddress(value)
      if (normalized) {
        dedupedAddresses.add(normalized)
      }
    }

    return Array.from(dedupedAddresses)
  } catch (_error) {
    return []
  }
}

export function addManualKasaneTokenAddress(address: string): void {
  if (!canUseLocalStorage()) {
    return
  }

  const normalized = normalizeKasaneTokenAddress(address)
  if (!normalized) {
    return
  }

  const existing = getManualKasaneTokenAddresses()
  if (existing.includes(normalized)) {
    return
  }

  try {
    window.localStorage.setItem(MANUAL_KASANE_TOKEN_ADDRESSES_KEY, JSON.stringify([...existing, normalized]))
  } catch (_error) {
    // noop
  }
}
