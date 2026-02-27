import { BackendApi } from '@universe/api'
import { useCallback, useMemo } from 'react'
import { FiatCurrency } from 'uniswap/src/features/fiatCurrency/constants'
import { getFiatCurrencyCode, useAppFiatCurrency } from 'uniswap/src/features/fiatCurrency/hooks'
import { LocalizationContextState } from 'uniswap/src/features/language/LocalizationContext'
import { FiatNumberType } from 'utilities/src/format/types'

type SupportedServerCurrency = Extract<
  BackendApi.Currency,
  | BackendApi.Currency.Ars
  | BackendApi.Currency.Aud
  | BackendApi.Currency.Brl
  | BackendApi.Currency.Cad
  | BackendApi.Currency.Cny
  | BackendApi.Currency.Cop
  | BackendApi.Currency.Eur
  | BackendApi.Currency.Gbp
  | BackendApi.Currency.Hkd
  | BackendApi.Currency.Idr
  | BackendApi.Currency.Inr
  | BackendApi.Currency.Jpy
  | BackendApi.Currency.Krw
  | BackendApi.Currency.Mxn
  | BackendApi.Currency.Ngn
  | BackendApi.Currency.Pkr
  | BackendApi.Currency.Rub
  | BackendApi.Currency.Sgd
  | BackendApi.Currency.Try
  | BackendApi.Currency.Uah
  | BackendApi.Currency.Usd
  | BackendApi.Currency.Vnd
>
const mapServerCurrencyToFiatCurrency: Record<BackendApi.Currency, FiatCurrency | undefined> = {
  [BackendApi.Currency.Ars]: FiatCurrency.ArgentinePeso,
  [BackendApi.Currency.Aud]: FiatCurrency.AustralianDollar,
  [BackendApi.Currency.Brl]: FiatCurrency.BrazilianReal,
  [BackendApi.Currency.Cad]: FiatCurrency.CanadianDollar,
  [BackendApi.Currency.Cny]: FiatCurrency.ChineseYuan,
  [BackendApi.Currency.Cop]: FiatCurrency.ColombianPeso,
  [BackendApi.Currency.Eur]: FiatCurrency.Euro,
  [BackendApi.Currency.Gbp]: FiatCurrency.BritishPound,
  [BackendApi.Currency.Hkd]: FiatCurrency.HongKongDollar,
  [BackendApi.Currency.Idr]: FiatCurrency.IndonesianRupiah,
  [BackendApi.Currency.Inr]: FiatCurrency.IndianRupee,
  [BackendApi.Currency.Jpy]: FiatCurrency.JapaneseYen,
  [BackendApi.Currency.Krw]: FiatCurrency.SouthKoreanWon,
  [BackendApi.Currency.Mxn]: FiatCurrency.MexicanPeso,
  [BackendApi.Currency.Ngn]: FiatCurrency.NigerianNaira,
  [BackendApi.Currency.Pkr]: FiatCurrency.PakistaniRupee,
  [BackendApi.Currency.Rub]: FiatCurrency.RussianRuble,
  [BackendApi.Currency.Sgd]: FiatCurrency.SingaporeDollar,
  [BackendApi.Currency.Try]: FiatCurrency.TurkishLira,
  [BackendApi.Currency.Uah]: FiatCurrency.UkrainianHryvnia,
  [BackendApi.Currency.Usd]: FiatCurrency.UnitedStatesDollar,
  [BackendApi.Currency.Vnd]: FiatCurrency.VietnameseDong,
  [BackendApi.Currency.Eth]: undefined,
  [BackendApi.Currency.Matic]: undefined,
  [BackendApi.Currency.Nzd]: undefined,
  [BackendApi.Currency.Thb]: undefined,
}
export const mapFiatCurrencyToServerCurrency: Record<FiatCurrency, SupportedServerCurrency> = {
  [FiatCurrency.ArgentinePeso]: BackendApi.Currency.Ars,
  [FiatCurrency.AustralianDollar]: BackendApi.Currency.Aud,
  [FiatCurrency.BrazilianReal]: BackendApi.Currency.Brl,
  [FiatCurrency.CanadianDollar]: BackendApi.Currency.Cad,
  [FiatCurrency.ChineseYuan]: BackendApi.Currency.Cny,
  [FiatCurrency.ColombianPeso]: BackendApi.Currency.Cop,
  [FiatCurrency.Euro]: BackendApi.Currency.Eur,
  [FiatCurrency.BritishPound]: BackendApi.Currency.Gbp,
  [FiatCurrency.HongKongDollar]: BackendApi.Currency.Hkd,
  [FiatCurrency.IndonesianRupiah]: BackendApi.Currency.Idr,
  [FiatCurrency.IndianRupee]: BackendApi.Currency.Inr,
  [FiatCurrency.JapaneseYen]: BackendApi.Currency.Jpy,
  [FiatCurrency.MexicanPeso]: BackendApi.Currency.Mxn,
  [FiatCurrency.SouthKoreanWon]: BackendApi.Currency.Krw,
  [FiatCurrency.NigerianNaira]: BackendApi.Currency.Ngn,
  [FiatCurrency.PakistaniRupee]: BackendApi.Currency.Pkr,
  [FiatCurrency.RussianRuble]: BackendApi.Currency.Rub,
  [FiatCurrency.SingaporeDollar]: BackendApi.Currency.Sgd,
  [FiatCurrency.TurkishLira]: BackendApi.Currency.Try,
  [FiatCurrency.UkrainianHryvnia]: BackendApi.Currency.Uah,
  [FiatCurrency.UnitedStatesDollar]: BackendApi.Currency.Usd,
  [FiatCurrency.VietnameseDong]: BackendApi.Currency.Vnd,
}

export interface FiatConverter {
  convertFiatAmount: (amount: number) => { amount: number; currency: FiatCurrency }
  convertFiatAmountFormatted: (
    fromAmount: Maybe<number | string>,
    numberType: FiatNumberType,
    placeholder?: string,
  ) => string
  conversionRate?: number
}

const SOURCE_CURRENCY = BackendApi.Currency.Usd // Assuming all currency data comes from USD

/**
 * Hook used to return a converter with a set of all necessary conversion logic needed for
 * fiat currency. This is based off of the currently selected language and fiat currency
 * in settings, using a graphql endpoint to retrieve the conversion rate.
 * This ensures that the converted and formatted values are properly localized. If any additional
 * conversion logic is needed, please add them here.
 * @returns set of localized fiat currency conversion functions
 */
export function useFiatConverter({
  formatNumberOrString,
}: Pick<LocalizationContextState, 'formatNumberOrString'>): FiatConverter {
  const appCurrency = useAppFiatCurrency()
  const toCurrency = mapFiatCurrencyToServerCurrency[appCurrency]

  const conversionRate = undefined
  const outputCurrency = mapServerCurrencyToFiatCurrency[toCurrency]

  const convertFiatAmountInner = useCallback(
    (amount: number): { amount: number; currency: FiatCurrency } => {
      const defaultResult = { amount, currency: FiatCurrency.UnitedStatesDollar }

      if (SOURCE_CURRENCY === toCurrency || !conversionRate || !outputCurrency) {
        return defaultResult
      }

      return {
        amount: amount * conversionRate,
        currency: outputCurrency,
      }
    },
    [conversionRate, outputCurrency, toCurrency],
  )
  const convertFiatAmountFormattedInner = useCallback(
    // eslint-disable-next-line max-params
    (fromAmount: Maybe<number | string>, numberType: FiatNumberType, placeholder = '-'): string => {
      if (fromAmount === undefined || fromAmount === null) {
        return placeholder
      }

      const amountNumber = typeof fromAmount === 'string' ? parseFloat(fromAmount) : fromAmount
      const converted = convertFiatAmountInner(amountNumber)
      const currencyCode = getFiatCurrencyCode(converted.currency)

      return formatNumberOrString({
        value: converted.amount,
        type: numberType,
        currencyCode,
        placeholder,
      })
    },
    [convertFiatAmountInner, formatNumberOrString],
  )

  return useMemo(
    () => ({
      conversionRate,
      convertFiatAmount: convertFiatAmountInner,
      convertFiatAmountFormatted: convertFiatAmountFormattedInner,
    }),
    [conversionRate, convertFiatAmountFormattedInner, convertFiatAmountInner],
  )
}
