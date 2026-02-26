import { GqlResult } from '@universe/api'
import { useMemo } from 'react'
import { TokenOption } from 'uniswap/src/components/lists/items/types'
import { type OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'
import { useOnchainItemListSection } from 'uniswap/src/components/lists/utils'
import { useCurrencyInfosToTokenOptions } from 'uniswap/src/components/TokenSelector/hooks/useCurrencyInfosToTokenOptions'
import { TradeableAsset } from 'uniswap/src/entities/assets'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useSearchTokens } from 'uniswap/src/features/dataApi/searchTokens'
import { noop } from 'utilities/src/react/noop'

export function useTokenSectionsForSearchResults({
  evmAddress: _evmAddress,
  svmAddress: _svmAddress,
  chainFilter,
  searchFilter,
  isBalancesOnlySearch: _isBalancesOnlySearch,
  input: _input,
}: {
  evmAddress?: string
  svmAddress?: string
  chainFilter: UniverseChainId | null
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

  const searchResults = useCurrencyInfosToTokenOptions({
    currencyInfos: searchResultCurrencies,
    portfolioBalancesById: undefined,
  })

  const loading = searchTokensLoading

  const searchResultsSections =
    useOnchainItemListSection({
      sectionKey: OnchainItemSectionName.SearchResults,
      options: searchResults,
    }) ?? []

  return useMemo(
    () => ({
      data: searchResultsSections,
      loading,
      error: searchTokensError || undefined,
      refetch: refetchSearchTokens ?? noop,
    }),
    [searchResultsSections, loading, searchTokensError, refetchSearchTokens],
  )
}
