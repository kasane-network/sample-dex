import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  getManualKasaneTokenAddresses,
  normalizeKasaneTokenAddress,
} from 'uniswap/src/components/TokenSelector/hooks/manualKasaneTokenStorage'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { fetchKasaneOnchainCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'

function getNormalizedAddress(value: string | null): Address | undefined {
  return normalizeKasaneTokenAddress(value)
}

type UseKasaneManualTokenCandidatesParams = {
  chainFilter: UniverseChainId | null
  searchFilter: string | null
  includePersistedAddresses: boolean
}

export function useKasaneManualTokenCandidates({
  chainFilter,
  searchFilter,
  includePersistedAddresses,
}: UseKasaneManualTokenCandidatesParams): {
  currencyInfos: CurrencyInfo[]
  loading: boolean
  error?: Error
} {
  const normalizedSearchAddress = useMemo(() => getNormalizedAddress(searchFilter), [searchFilter])

  const addressesToResolve = useMemo(() => {
    if (chainFilter !== UniverseChainId.Kasane) {
      return []
    }

    const addresses = new Set<string>()

    if (includePersistedAddresses) {
      for (const persistedAddress of getManualKasaneTokenAddresses()) {
        addresses.add(persistedAddress)
      }
    }

    if (normalizedSearchAddress) {
      addresses.add(normalizedSearchAddress)
    }

    return Array.from(addresses)
  }, [chainFilter, includePersistedAddresses, normalizedSearchAddress])

  const {
    data: currencyInfos,
    isLoading,
    error,
  } = useQuery<CurrencyInfo[]>({
    queryKey: ['kasane-manual-token-candidates', ...addressesToResolve.map((address) => address.toLowerCase())],
    queryFn: async () => {
      if (addressesToResolve.length === 0) {
        return []
      }

      const candidateInfos = await Promise.all(
        addressesToResolve.map(async (address) => {
          return await fetchKasaneOnchainCurrencyInfo({
            currencyId: buildCurrencyId(UniverseChainId.Kasane, address),
            tokenAddress: address,
          })
        }),
      )

      const byCurrencyId = new Map<string, CurrencyInfo>()
      for (const candidateInfo of candidateInfos) {
        if (!candidateInfo) {
          continue
        }
        byCurrencyId.set(candidateInfo.currencyId.toLowerCase(), candidateInfo)
      }

      return Array.from(byCurrencyId.values())
    },
    enabled: chainFilter === UniverseChainId.Kasane && addressesToResolve.length > 0,
    retry: false,
    staleTime: 30_000,
    gcTime: 60_000,
  })

  return {
    currencyInfos: currencyInfos ?? [],
    loading: isLoading,
    error: error instanceof Error ? error : undefined,
  }
}
