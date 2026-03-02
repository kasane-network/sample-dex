import { GqlResult } from '@universe/api'
import { useMemo } from 'react'
import { TokenOption } from 'uniswap/src/components/lists/items/types'
import { type OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'
import { useOnchainItemListSection } from 'uniswap/src/components/lists/utils'
import { useCurrencyInfosToTokenOptions } from 'uniswap/src/components/TokenSelector/hooks/useCurrencyInfosToTokenOptions'
import { useKasaneManualTokenCandidates } from 'uniswap/src/components/TokenSelector/hooks/useKasaneManualTokenCandidates'
import { TradeableAsset } from 'uniswap/src/entities/assets'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useSearchTokens } from 'uniswap/src/features/dataApi/searchTokens'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { noop } from 'utilities/src/react/noop'

function dedupeCurrencyInfos(currencyInfos: CurrencyInfo[]): CurrencyInfo[] {
  const byCurrencyId = new Map<string, CurrencyInfo>()

  for (const currencyInfo of currencyInfos) {
    byCurrencyId.set(currencyInfo.currencyId.toLowerCase(), currencyInfo)
  }

  return Array.from(byCurrencyId.values())
}

export function useTokenSectionsForSearchResults({
  evmAddress: _evmAddress,
  svmAddress: _svmAddress,
  chainFilter,
  manualChainFilter,
  searchFilter,
  isBalancesOnlySearch: _isBalancesOnlySearch,
  input: _input,
}: {
  evmAddress?: string
  svmAddress?: string
  chainFilter: UniverseChainId | null
  manualChainFilter?: UniverseChainId | null
  searchFilter: string | null
  isBalancesOnlySearch: boolean
  input?: TradeableAsset
}): GqlResult<OnchainItemSection<TokenOption>[]> {
  const {
    data: searchResultCurrencies,
    error: searchTokensError,
    refetch: refetchSearchTokens,
    loading: searchTokensLoading,
  } = useSearchTokens({
    searchQuery: searchFilter,
    chainFilter,
    skip: false,
    hideWSOL: true, // Hide WSOL in token selector
  })

  const {
    currencyInfos: manualCandidateCurrencyInfos,
    loading: manualCandidatesLoading,
    error: manualCandidatesError,
  } = useKasaneManualTokenCandidates({
    chainFilter: manualChainFilter ?? chainFilter,
    searchFilter,
    includePersistedAddresses: false,
  })

  const mergedSearchResultCurrencies = useMemo(() => {
    return dedupeCurrencyInfos([...(manualCandidateCurrencyInfos ?? []), ...(searchResultCurrencies ?? [])])
  }, [manualCandidateCurrencyInfos, searchResultCurrencies])

  const searchResults = useCurrencyInfosToTokenOptions({
    currencyInfos: mergedSearchResultCurrencies,
    portfolioBalancesById: undefined,
  })

  const loading = searchTokensLoading || manualCandidatesLoading

  const searchResultsSections =
    useOnchainItemListSection({
      sectionKey: OnchainItemSectionName.SearchResults,
      options: searchResults,
    }) ?? []

  return useMemo(
    () => ({
      data: searchResultsSections,
      loading,
      error: searchTokensError ?? manualCandidatesError ?? undefined,
      refetch: refetchSearchTokens ?? noop,
    }),
    [searchResultsSections, loading, searchTokensError, manualCandidatesError, refetchSearchTokens],
  )
}
