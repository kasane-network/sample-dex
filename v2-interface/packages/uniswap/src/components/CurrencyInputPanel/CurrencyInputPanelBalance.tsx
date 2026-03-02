import type { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Text } from 'ui/src'
import type { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { CurrencyField } from 'uniswap/src/types/currency'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'
import { NumberType } from 'utilities/src/format/types'

interface CurrencyInputBalanceProps {
  currencyBalance: Maybe<CurrencyAmount<Currency>>
  currencyInfo: Maybe<CurrencyInfo>
  showInsufficientBalanceWarning: boolean
  currencyField: CurrencyField
  hideBalance: boolean
}
export function CurrencyInputPanelBalance({
  currencyBalance,
  currencyInfo,
  currencyField,
  showInsufficientBalanceWarning,
  hideBalance,
}: CurrencyInputBalanceProps): JSX.Element | null {
  const { formatCurrencyAmount } = useLocalizationContext()
  const isOutput = currencyField === CurrencyField.OUTPUT

  // Hide balance if balance is not loaded, output balance is exactly zero, or caller explicitly hides it.
  const hideCurrencyBalance = !currencyBalance || (isOutput && currencyBalance.equalTo(0)) || hideBalance

  if (hideCurrencyBalance) {
    return null
  }

  const symbol = currencyInfo?.currency.symbol ?? currencyBalance.currency.symbol

  return (
    <Text color={showInsufficientBalanceWarning ? '$statusCritical' : '$neutral2'} variant="body3">
      {formatCurrencyAmount({
        value: currencyBalance,
        type: NumberType.TokenTx,
      })}{' '}
      {getSymbolDisplayText(symbol)}
    </Text>
  )
}
