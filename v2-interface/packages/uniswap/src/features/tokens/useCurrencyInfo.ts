import { useMemo } from 'react'
import { getCommonBase } from 'uniswap/src/constants/routing'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useSearchTokens } from 'uniswap/src/features/dataApi/searchTokens'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import {
  buildNativeCurrencyId,
  buildWrappedNativeCurrencyId,
  currencyIdToAddress,
  currencyIdToChain,
} from 'uniswap/src/utils/currencyId'

function parseCurrencyId(_currencyId?: string): { chainId: UniverseChainId | null; address?: Address } {
  const chainId = _currencyId ? currencyIdToChain(_currencyId) : null
  if (!_currencyId) {
    return { chainId }
  }

  try {
    return { chainId, address: currencyIdToAddress(_currencyId) }
  } catch (_error) {
    return { chainId, address: undefined }
  }
}

function findByAddress(currencyInfos: CurrencyInfo[] | undefined, address?: Address): CurrencyInfo | undefined {
  if (!currencyInfos || !address) {
    return undefined
  }

  return currencyInfos.find((info) => {
    try {
      const fallbackAddress = currencyIdToAddress(info.currencyId)
      return fallbackAddress.toLowerCase() === address.toLowerCase()
    } catch (_error) {
      return false
    }
  })
}

function useCurrencyInfoQuery(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): { currencyInfo: Maybe<CurrencyInfo>; loading: boolean; error?: Error } {
  const { chainId: currencyChainId, address: currencyAddressFromId } = parseCurrencyId(_currencyId)

  const {
    data: fallbackCurrencyInfos,
    loading: fallbackCurrencyInfosLoading,
    error: fallbackCurrencyInfosError,
  } = useSearchTokens({
    searchQuery: currencyAddressFromId ?? null,
    chainFilter: currencyChainId === UniverseChainId.Kasane ? UniverseChainId.Kasane : null,
    skip: options?.skip === true || currencyChainId !== UniverseChainId.Kasane || !currencyAddressFromId,
    hideWSOL: false,
    size: 20,
  })

  const currencyInfo = useMemo(() => {
    if (!_currencyId) {
      return undefined
    }

    const chainId = currencyChainId
    const address = currencyAddressFromId
    if (chainId && address) {
      const commonBase = getCommonBase(chainId, address)
      if (commonBase) {
        const copyCommonBase = { ...commonBase }
        copyCommonBase.currencyId = _currencyId
        return copyCommonBase
      }
    }

    if (chainId === UniverseChainId.Kasane && address) {
      const fallbackMatch = findByAddress(fallbackCurrencyInfos, address)
      if (fallbackMatch) {
        return fallbackMatch
      }
    }

    return undefined
  }, [_currencyId, currencyAddressFromId, currencyChainId, fallbackCurrencyInfos])

  return {
    currencyInfo,
    loading: fallbackCurrencyInfosLoading,
    error: fallbackCurrencyInfosError,
  }
}

export function useCurrencyInfo(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): Maybe<CurrencyInfo> {
  const { currencyInfo } = useCurrencyInfoQuery(_currencyId, options)
  return currencyInfo
}

export function useCurrencyInfoWithLoading(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): {
  currencyInfo: Maybe<CurrencyInfo>
  loading: boolean
  error?: Error
} {
  return useCurrencyInfoQuery(_currencyId, options)
}

export function useCurrencyInfos(
  _currencyIds: string[],
  options?: { refetch?: boolean; skip?: boolean },
): Maybe<CurrencyInfo>[] {
  const kasaneAddresses = useMemo(() => {
    const addresses: Address[] = []
    for (const _currencyId of _currencyIds) {
      const { chainId, address } = parseCurrencyId(_currencyId)
      if (chainId === UniverseChainId.Kasane && address) {
        addresses.push(address)
      }
    }
    return addresses
  }, [_currencyIds])

  const { data: kasaneCurrencies } = useSearchTokens({
    searchQuery: null,
    chainFilter: UniverseChainId.Kasane,
    skip: options?.skip === true || kasaneAddresses.length === 0,
    hideWSOL: false,
    size: Math.max(100, kasaneAddresses.length * 2),
  })

  return useMemo(() => {
    return _currencyIds.map((_currencyId) => {
      const { chainId, address } = parseCurrencyId(_currencyId)
      if (!chainId || !address) {
        return undefined
      }

      const commonBase = getCommonBase(chainId, address)
      if (commonBase) {
        const copyCommonBase = { ...commonBase }
        copyCommonBase.currencyId = _currencyId
        return copyCommonBase
      }

      if (chainId === UniverseChainId.Kasane) {
        return findByAddress(kasaneCurrencies, address)
      }

      return undefined
    })
  }, [_currencyIds, kasaneCurrencies])
}

export function useNativeCurrencyInfo(chainId: UniverseChainId): Maybe<CurrencyInfo> {
  const nativeCurrencyId = buildNativeCurrencyId(chainId)
  return useCurrencyInfo(nativeCurrencyId)
}

export function useWrappedNativeCurrencyInfo(chainId: UniverseChainId): Maybe<CurrencyInfo> {
  const wrappedCurrencyId = buildWrappedNativeCurrencyId(chainId)
  return useCurrencyInfo(wrappedCurrencyId)
}
