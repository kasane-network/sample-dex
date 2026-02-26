import { GqlResult } from '@universe/api'
import { useMemo } from 'react'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { CurrencyId } from 'uniswap/src/types/currency'

/**
 * GraphQL removal: token project query is disabled, so this returns empty data.
 */
export function useTokenProjects(_currencyIds: CurrencyId[]): GqlResult<CurrencyInfo[]> {
  return useMemo(
    () => ({
      data: undefined,
      loading: false,
      refetch: () => undefined,
      error: undefined,
    }),
    [],
  )
}
