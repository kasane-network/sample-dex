import { useQuery } from '@tanstack/react-query'
import { createSupabaseTokenReadClient, GqlResult, GraphQLApi } from '@universe/api'
import type { TokenReadModel } from '@universe/api/src/tokenIndexer/supabaseReadClient'
import { useMemo } from 'react'
import { COMMON_BASES } from 'uniswap/src/constants/routing'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { CurrencyInfo, TokenList } from 'uniswap/src/features/dataApi/types'
import { buildCurrency, buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { NUMBER_OF_RESULTS_LONG } from 'uniswap/src/features/search/SearchModal/constants'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { isWSOL } from 'uniswap/src/utils/isWSOL'
import { useEvent } from 'utilities/src/react/hooks'
import { noop } from 'utilities/src/react/noop'

const DEFAULT_SUPABASE_URL = 'https://kvkejvvkhslmudjcvsbq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a2VqdnZraHNsbXVkamN2c2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzkwOTUsImV4cCI6MjA4NzMxNTA5NX0.DTu4KuEdJ5USpp9fm5QX2sJojkpsSdc0g6vXPnOrMYg'

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function toCurrencyInfoFromSupabase(model: TokenReadModel): CurrencyInfo | null {
  if (model.registry.chainId !== UniverseChainId.Kasane) {
    return null
  }

  const currency = buildCurrency({
    chainId: UniverseChainId.Kasane,
    address: model.registry.address,
    decimals: model.registry.decimals,
    symbol: model.registry.symbol,
    name: model.registry.name,
  })

  if (!currency) {
    return null
  }

  return buildCurrencyInfo({
    currency,
    currencyId: currencyId(currency),
    logoUrl: model.registry.logoUri,
    isSpam: model.registry.isSpam,
    safetyInfo: {
      tokenList: TokenList.Default,
      protectionResult: GraphQLApi.ProtectionResult.Benign,
    },
  })
}

export function useSearchTokens({
  searchQuery,
  chainFilter: _chainFilter,
  skip,
  size = NUMBER_OF_RESULTS_LONG,
  hideWSOL = false,
}: {
  searchQuery: string | null
  chainFilter: UniverseChainId | null
  skip: boolean
  size?: number
  hideWSOL?: boolean
}): GqlResult<CurrencyInfo[]> {
  useEnabledChains()

  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY

  const singleChainId = UniverseChainId.Kasane
  const canUseSupabaseSearch = Boolean(!skip && supabaseUrl && supabaseAnonKey)

  const supabaseClient = useMemo(() => {
    if (!canUseSupabaseSearch || !supabaseUrl || !supabaseAnonKey) {
      return undefined
    }
    return createSupabaseTokenReadClient({
      supabaseUrl,
      anonKey: supabaseAnonKey,
    })
  }, [canUseSupabaseSearch, supabaseAnonKey, supabaseUrl])

  const supabaseTokenSelect = useEvent((rows: TokenReadModel[]): CurrencyInfo[] => {
    return rows
      .map((row) => toCurrencyInfoFromSupabase(row))
      .filter((c): c is CurrencyInfo => {
        if (!c) {
          return false
        }
        if (hideWSOL && isWSOL(c.currency)) {
          return false
        }
        return true
      })
  })

  const {
    data: supabaseTokens,
    error: supabaseError,
    isPending: supabasePending,
    refetch: refetchSupabase,
  } = useQuery<CurrencyInfo[], Error>({
    queryKey: ['token-search-supabase', singleChainId, searchQuery ?? '', size],
    enabled: canUseSupabaseSearch,
    queryFn: async () => {
      if (!supabaseClient) {
        return []
      }

      const query = searchQuery?.trim()
      if (query && query.length > 0) {
        const rows = await supabaseClient.searchTokens({
          chainId: singleChainId,
          query,
          limit: size,
        })
        const selectedRows = supabaseTokenSelect(rows)
        if (selectedRows.length > 0) {
          return selectedRows
        }

        // Keep token selector usable even when search index is stale:
        // fallback to the same Supabase source of truth (registry list), not external APIs.
        const listRows = await supabaseClient.listTokens({
          chainId: singleChainId,
          limit: size,
        })
        return supabaseTokenSelect(listRows)
      }

      const rows = await supabaseClient.listTokens({
        chainId: singleChainId,
        limit: size,
      })
      return supabaseTokenSelect(rows)
    },
  })

  const selectedData = canUseSupabaseSearch ? supabaseTokens : []
  const selectedLoading = canUseSupabaseSearch ? supabasePending : false
  const selectedError = canUseSupabaseSearch ? supabaseError : undefined
  const selectedRefetch = canUseSupabaseSearch ? refetchSupabase : noop
  const kasaneNativeCurrencyInfo = useMemo(
    () => (COMMON_BASES[UniverseChainId.Kasane] ?? []).find((info) => info.currency.isNative),
    [],
  )
  const localKasaneTokens = useMemo(() => {
    if (canUseSupabaseSearch || skip) {
      return []
    }

    const query = searchQuery?.trim().toLowerCase()
    const bases = (COMMON_BASES[UniverseChainId.Kasane] ?? []).filter((info) => {
      if (hideWSOL && isWSOL(info.currency)) {
        return false
      }
      if (!query) {
        return true
      }
      const symbol = info.currency.symbol?.toLowerCase() ?? ''
      const name = info.currency.name?.toLowerCase() ?? ''
      const address = info.currency.isToken ? info.currency.address.toLowerCase() : ''
      return symbol.includes(query) || name.includes(query) || address.includes(query)
    })

    return bases.slice(0, size)
  }, [canUseSupabaseSearch, hideWSOL, searchQuery, size, skip])

  const shouldIncludeKasaneNative = useMemo(() => {
    if (!kasaneNativeCurrencyInfo) {
      return false
    }
    const query = searchQuery?.trim().toLowerCase()
    if (!query) {
      return true
    }
    const symbol = kasaneNativeCurrencyInfo.currency.symbol?.toLowerCase() ?? ''
    const name = kasaneNativeCurrencyInfo.currency.name?.toLowerCase() ?? ''
    return symbol.includes(query) || name.includes(query)
  }, [kasaneNativeCurrencyInfo, searchQuery])

  const mergedData = useMemo(() => {
    const baseData = canUseSupabaseSearch ? (selectedData ?? []) : localKasaneTokens
    if (!shouldIncludeKasaneNative || !kasaneNativeCurrencyInfo) {
      return baseData
    }
    const hasNative = baseData.some((info) => info.currencyId === kasaneNativeCurrencyInfo.currencyId)
    if (hasNative) {
      return baseData
    }
    return [kasaneNativeCurrencyInfo, ...baseData].slice(0, size)
  }, [canUseSupabaseSearch, kasaneNativeCurrencyInfo, localKasaneTokens, selectedData, shouldIncludeKasaneNative, size])

  return useMemo(
    () => ({
      data: mergedData,
      loading: selectedLoading,
      error: selectedError ?? undefined,
      refetch: selectedRefetch,
    }),
    [mergedData, selectedError, selectedLoading, selectedRefetch],
  )
}
