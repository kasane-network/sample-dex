import { GqlResult } from '@universe/api'
import { memo, useMemo } from 'react'
import { TokenOption, TokenSelectorOption } from 'uniswap/src/components/lists/items/types'
import { type OnchainItemSection, OnchainItemSectionName } from 'uniswap/src/components/lists/OnchainItemList/types'
import { useOnchainItemListSection } from 'uniswap/src/components/lists/utils'
import { useCurrencyInfosToTokenOptions } from 'uniswap/src/components/TokenSelector/hooks/useCurrencyInfosToTokenOptions'
import { useRecentlySearchedTokens } from 'uniswap/src/components/TokenSelector/hooks/useRecentlySearchedTokens'
import { TokenSelectorList } from 'uniswap/src/components/TokenSelector/TokenSelectorList'
import { OnSelectCurrency } from 'uniswap/src/components/TokenSelector/types'
import { TradeableAsset } from 'uniswap/src/entities/assets'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useSearchTokens } from 'uniswap/src/features/dataApi/searchTokens'
import { ClearRecentSearchesButton } from 'uniswap/src/features/search/ClearRecentSearchesButton'
import { noop } from 'utilities/src/react/noop'

function useTokenSectionsForSwap({
  chainFilter,
}: {
  chainFilter: UniverseChainId | null
}): GqlResult<OnchainItemSection<TokenSelectorOption>[]> {
  const recentlySearchedTokenOptions = useRecentlySearchedTokens(chainFilter)
  const recentSectionOptions = useMemo<TokenOption[]>(
    () => recentlySearchedTokenOptions,
    [recentlySearchedTokenOptions],
  )

  // Fetch suggested tokens from Supabase so the list is never empty
  const {
    data: suggestedCurrencyInfos,
    loading: suggestedLoading,
    error: suggestedError,
    refetch: suggestedRefetch,
  } = useSearchTokens({
    searchQuery: null,
    chainFilter,
    skip: false,
    hideWSOL: true,
  })

  const suggestedTokenOptions = useCurrencyInfosToTokenOptions({
    currencyInfos: suggestedCurrencyInfos,
    portfolioBalancesById: undefined,
  })

  const memoizedEndElement = useMemo(() => <ClearRecentSearchesButton />, [])
  const recentSection = useOnchainItemListSection({
    sectionKey: OnchainItemSectionName.RecentSearches,
    options: recentSectionOptions,
    endElement: memoizedEndElement,
  })

  const suggestedSection = useOnchainItemListSection({
    sectionKey: OnchainItemSectionName.SuggestedTokens,
    options: suggestedTokenOptions ?? [],
  })

  const sections = useMemo(
    () => [...(recentSection ?? []), ...(suggestedSection ?? [])],
    [recentSection, suggestedSection],
  )

  return useMemo(
    () => ({
      data: sections,
      loading: suggestedLoading,
      error: suggestedError ?? undefined,
      refetch: suggestedRefetch ?? noop,
    }),
    [sections, suggestedLoading, suggestedError, suggestedRefetch],
  )
}

function _TokenSelectorSwapList({
  onSelectCurrency,
  evmAddress: _evmAddress,
  svmAddress: _svmAddress,
  chainFilter,
  oppositeSelectedToken: _oppositeSelectedToken,
  renderedInModal,
}: {
  onSelectCurrency: OnSelectCurrency
  evmAddress?: string
  svmAddress?: string
  chainFilter: UniverseChainId | null
  oppositeSelectedToken?: TradeableAsset
  renderedInModal: boolean
}): JSX.Element {
  const {
    data: sections,
    loading,
    error,
    refetch,
  } = useTokenSectionsForSwap({
    chainFilter,
  })
  return (
    <TokenSelectorList
      showTokenAddress
      chainFilter={chainFilter}
      hasError={Boolean(error)}
      loading={loading}
      refetch={refetch}
      sections={sections}
      showTokenWarnings={false}
      renderedInModal={renderedInModal}
      onSelectCurrency={onSelectCurrency}
    />
  )
}

export const TokenSelectorSwapList = memo(_TokenSelectorSwapList)
