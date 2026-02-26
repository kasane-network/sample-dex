import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { TradingApi } from '@universe/api'
import { DepositInfo } from 'components/Liquidity/types'
import { useEffect, useMemo, useState } from 'react'
import { PositionField } from 'types/position'
import { useCreateLpPositionCalldataQuery } from 'uniswap/src/data/apiClients/tradingApi/useCreateLpPositionCalldataQuery'
import { useIncreaseLpPositionCalldataQuery } from 'uniswap/src/data/apiClients/tradingApi/useIncreaseLpPositionCalldataQuery'
import { useUSDCValue } from 'uniswap/src/features/transactions/hooks/useUSDCPrice'
import { ONE_SECOND_MS } from 'utilities/src/time/time'

function isLpDebugEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true
  }
  return typeof window !== 'undefined' && window.localStorage.getItem('debug_lp') === '1'
}

export function useIncreasePositionDependentAmountFallback(
  queryParams: TradingApi.IncreaseLPPositionRequest | undefined,
  isQueryEnabled: boolean,
) {
  const [hasErrorResponse, setHasErrorResponse] = useState(false)

  const { data, error } = useIncreaseLpPositionCalldataQuery({
    params: {
      ...queryParams,
      simulateTransaction: false,
    },
    refetchInterval: hasErrorResponse ? false : 5 * ONE_SECOND_MS,
    retry: false,
    enabled: isQueryEnabled && queryParams?.simulateTransaction,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: +queryParams
  useEffect(() => {
    setHasErrorResponse(!!error)
  }, [error, queryParams])

  return data?.dependentAmount
}

export function useCreatePositionDependentAmountFallback(
  queryParams: TradingApi.CreateLPPositionRequest | undefined,
  isQueryEnabled: boolean,
) {
  const [hasErrorResponse, setHasErrorResponse] = useState(false)

  const { data, error } = useCreateLpPositionCalldataQuery({
    params: {
      ...queryParams,
      simulateTransaction: false,
    },
    refetchInterval: hasErrorResponse ? false : 5 * ONE_SECOND_MS,
    retry: false,
    enabled: isQueryEnabled && queryParams?.simulateTransaction,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: +queryParams
  useEffect(() => {
    setHasErrorResponse(!!error)
  }, [error, queryParams])

  return data?.dependentAmount
}

export function useUpdatedAmountsFromDependentAmount({
  token0,
  token1,
  dependentAmount,
  exactField,
  currencyAmounts,
  currencyAmountsUSDValue,
  formattedAmounts,
  deposit0Disabled,
  deposit1Disabled,
}: {
  token0: Maybe<Currency>
  token1: Maybe<Currency>
  dependentAmount?: string
  exactField: PositionField
  deposit0Disabled?: boolean
  deposit1Disabled?: boolean
} & Pick<DepositInfo, 'currencyAmounts' | 'currencyAmountsUSDValue' | 'formattedAmounts'>): {
  updatedFormattedAmounts?: { [field in PositionField]?: string }
  updatedUSDAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  updatedCurrencyAmounts?: { [field in PositionField]?: Maybe<CurrencyAmount<Currency>> }
  updatedDeposit0Disabled?: boolean
  updatedDeposit1Disabled?: boolean
} {
  const normalizedDependentAmount = useMemo(() => {
    if (!dependentAmount) {
      return undefined
    }

    try {
      const rawAmount = BigInt(dependentAmount)
      return rawAmount > 0n ? dependentAmount : undefined
    } catch {
      return undefined
    }
  }, [dependentAmount])

  const dependentAmount0 =
    normalizedDependentAmount && exactField === PositionField.TOKEN1 && token0
      ? CurrencyAmount.fromRawAmount(token0, normalizedDependentAmount)
      : undefined
  const dependentAmount0USDValue = useUSDCValue(dependentAmount0)

  const dependentAmount1 =
    normalizedDependentAmount && exactField === PositionField.TOKEN0 && token1
      ? CurrencyAmount.fromRawAmount(token1, normalizedDependentAmount)
      : undefined
  const dependentAmount1USDValue = useUSDCValue(dependentAmount1)

  useEffect(() => {
    if (!isLpDebugEnabled()) {
      return
    }

    console.info('[LP_DEBUG][useUpdatedAmountsFromDependentAmount]', {
      exactField,
      rawDependentAmount: dependentAmount,
      normalizedDependentAmount,
      applyDependentAmount0: Boolean(dependentAmount0),
      applyDependentAmount1: Boolean(dependentAmount1),
      resultingToken0: dependentAmount0?.toExact(),
      resultingToken1: dependentAmount1?.toExact(),
    })
  }, [dependentAmount, dependentAmount0, dependentAmount1, exactField, normalizedDependentAmount])

  return useMemo(() => {
    if (dependentAmount0) {
      return {
        updatedFormattedAmounts: {
          ...formattedAmounts,
          TOKEN0: dependentAmount0.toExact(),
        },
        updatedUSDAmounts: {
          ...currencyAmountsUSDValue,
          TOKEN0: dependentAmount0USDValue,
        },
        updatedCurrencyAmounts: {
          ...currencyAmounts,
          TOKEN0: dependentAmount0,
        },
        updatedDeposit0Disabled: !dependentAmount0.greaterThan(0),
        updatedDeposit1Disabled: deposit1Disabled,
      }
    } else if (dependentAmount1) {
      return {
        updatedFormattedAmounts: {
          ...formattedAmounts,
          TOKEN1: dependentAmount1.toExact(),
        },
        updatedUSDAmounts: {
          ...currencyAmountsUSDValue,
          TOKEN1: dependentAmount1USDValue,
        },
        updatedCurrencyAmounts: {
          ...currencyAmounts,
          TOKEN1: dependentAmount1,
        },
        updatedDeposit0Disabled: deposit0Disabled,
        updatedDeposit1Disabled: !dependentAmount1.greaterThan(0),
      }
    }
    return {
      updatedFormattedAmounts: formattedAmounts,
      updatedUSDAmounts: currencyAmountsUSDValue,
      updatedCurrencyAmounts: currencyAmounts,
      updatedDeposit0Disabled: deposit0Disabled,
      updatedDeposit1Disabled: deposit1Disabled,
    }
  }, [
    dependentAmount0,
    dependentAmount0USDValue,
    dependentAmount1,
    dependentAmount1USDValue,
    currencyAmounts,
    currencyAmountsUSDValue,
    formattedAmounts,
    deposit0Disabled,
    deposit1Disabled,
  ])
}
