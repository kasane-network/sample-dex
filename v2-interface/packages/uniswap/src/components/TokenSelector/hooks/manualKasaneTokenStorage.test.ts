import { getAddress } from '@ethersproject/address'

import {
  addManualKasaneTokenAddress,
  getManualKasaneTokenAddresses,
  normalizeKasaneTokenAddress,
} from 'uniswap/src/components/TokenSelector/hooks/manualKasaneTokenStorage'

const STORAGE_KEY = 'manual-kasane-token-addresses-v1'

describe('manualKasaneTokenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('normalizeKasaneTokenAddress', () => {
    it('normalizes non-checksum addresses', () => {
      const lowerAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      expect(normalizeKasaneTokenAddress(lowerAddress)).toBe(getAddress(lowerAddress))
    })

    it('returns undefined for invalid address values', () => {
      expect(normalizeKasaneTokenAddress('not-an-address')).toBeUndefined()
      expect(normalizeKasaneTokenAddress(null)).toBeUndefined()
    })
  })

  it('deduplicates and persists normalized addresses', () => {
    const lowerAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const checksumAddress = getAddress(lowerAddress)

    addManualKasaneTokenAddress(lowerAddress)
    addManualKasaneTokenAddress(checksumAddress)

    expect(getManualKasaneTokenAddresses()).toEqual([checksumAddress])
  })

  it('returns empty array for malformed localStorage payload', () => {
    window.localStorage.setItem(STORAGE_KEY, '{')
    expect(getManualKasaneTokenAddresses()).toEqual([])
  })
})
