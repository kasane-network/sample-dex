// Where: apps/web/src/pages/CreatePosition/index.tsx
// What: Restores the /positions/create flow and wires it to existing create-liquidity components.
// Why: "/positions/create/*" route was disconnected, causing "not-found" from Positions "New" actions.
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { ErrorCallout } from 'components/ErrorCallout'
import { Currency } from '@uniswap/sdk-core'
import { SelectTokensStep } from 'components/Liquidity/Create/SelectTokenStep'
import { PositionFlowStep } from 'components/Liquidity/Create/types'
import { useLiquidityUrlState } from 'components/Liquidity/Create/hooks/useLiquidityUrlState'
import { DepositInputForm } from 'components/Liquidity/DepositInputForm'
import { useUpdatedAmountsFromDependentAmount } from 'components/Liquidity/hooks/useDependentAmountFallback'
import { LiquidityModalDetailRows } from 'components/Liquidity/LiquidityModalDetailRows'
import { getFieldsDisabled } from 'components/Liquidity/utils/priceRangeInfo'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useParams } from 'react-router'
import { PositionField } from 'types/position'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { LPTransactionSettingsStoreContextProvider } from 'uniswap/src/features/transactions/components/settings/stores/transactionSettingsStore/LPTransactionSettingsStoreContextProvider'
import { Button, Flex } from 'ui/src'
import { CreateLiquidityContextProvider, useCreateLiquidityContext } from 'pages/CreatePosition/CreateLiquidityContextProvider'
import { CreatePositionModal } from 'pages/CreatePosition/CreatePositionModal'
import { CreatePositionTxContextProvider, useCreatePositionTxContext } from 'pages/CreatePosition/CreatePositionTxContext'

function areSameCurrency(a: Maybe<Currency>, b: Maybe<Currency>): boolean {
  if (!a && !b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.equals(b)
}

function getProtocolVersionFromPath(version?: string): ProtocolVersion | undefined {
  if (version === 'v2') {
    return ProtocolVersion.V2
  }
  return undefined
}

function CreatePositionDepositStep({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation()
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const { protocolVersion, poolOrPair, ticks, currencies, depositState, setDepositState, setStep } = useCreateLiquidityContext()
  const {
    txInfo,
    gasFeeEstimateUSD,
    transactionError,
    setTransactionError,
    dependentAmount,
    currencyAmounts,
    inputError,
    formattedAmounts,
    currencyAmountsUSDValue,
    currencyBalances,
  } = useCreatePositionTxContext()

  const exactField = depositState.exactField
  const { TOKEN0: deposit0Disabled, TOKEN1: deposit1Disabled } = getFieldsDisabled({
    ticks,
    poolOrPair: protocolVersion === ProtocolVersion.V2 ? undefined : poolOrPair,
  })

  const {
    updatedFormattedAmounts,
    updatedUSDAmounts,
    updatedCurrencyAmounts,
    updatedDeposit0Disabled,
    updatedDeposit1Disabled,
  } = useUpdatedAmountsFromDependentAmount({
    token0: currencies.display.TOKEN0,
    token1: currencies.display.TOKEN1,
    dependentAmount,
    exactField,
    currencyAmounts,
    currencyAmountsUSDValue,
    formattedAmounts,
    deposit0Disabled,
    deposit1Disabled,
  })

  const handleUserInput = (field: PositionField, newValue: string) => {
    setDepositState((prev) => ({
      ...prev,
      exactField: field,
      exactAmounts: {
        ...prev.exactAmounts,
        [field]: newValue,
      },
    }))
  }

  const handleOnSetMax = (field: PositionField, amount: string) => {
    setDepositState((prev) => ({
      ...prev,
      exactField: field,
      exactAmounts: {
        ...prev.exactAmounts,
        [field]: amount,
      },
    }))
  }

  const requestLoading = Boolean(!inputError && currencyAmounts?.TOKEN0 && currencyAmounts.TOKEN1 && !txInfo?.txRequest)

  const inputErrorMessage = typeof inputError === 'string' ? inputError : undefined
  const reviewButtonText = inputErrorMessage ?? (transactionError !== true ? transactionError : undefined)
  const isReviewDisabled = Boolean(inputError || transactionError) || !txInfo?.txRequest

  return (
    <Flex gap="$gap24">
      <DepositInputForm
        token0={currencies.display.TOKEN0 ?? undefined}
        token1={currencies.display.TOKEN1 ?? undefined}
        formattedAmounts={updatedFormattedAmounts}
        currencyAmounts={updatedCurrencyAmounts}
        currencyAmountsUSDValue={updatedUSDAmounts}
        currencyBalances={currencyBalances}
        onUserInput={handleUserInput}
        onSetMax={handleOnSetMax}
        deposit0Disabled={updatedDeposit0Disabled}
        deposit1Disabled={updatedDeposit1Disabled}
        amount0Loading={requestLoading && exactField === PositionField.TOKEN1}
        amount1Loading={requestLoading && exactField === PositionField.TOKEN0}
      />

      <LiquidityModalDetailRows
        currency0Amount={updatedCurrencyAmounts?.TOKEN0 ?? undefined}
        currency1Amount={updatedCurrencyAmounts?.TOKEN1 ?? undefined}
        networkCost={gasFeeEstimateUSD ?? undefined}
      />

      <ErrorCallout errorMessage={transactionError} />

      <Flex row gap="$gap8">
        <Button
          variant="default"
          emphasis="secondary"
          size="large"
          onPress={() => {
            setStep(PositionFlowStep.SELECT_TOKENS_AND_FEE_TIER)
            onBack?.()
          }}
        >
          {t('common.button.back')}
        </Button>
        <Button
          variant="branded"
          size="large"
          isDisabled={isReviewDisabled}
          loading={requestLoading}
          onPress={() => setIsReviewOpen(true)}
        >
          {reviewButtonText || t('swap.button.review')}
        </Button>
      </Flex>

      <CreatePositionModal
        formattedAmounts={updatedFormattedAmounts}
        currencyAmounts={updatedCurrencyAmounts}
        currencyAmountsUSDValue={updatedUSDAmounts}
        txInfo={txInfo}
        gasFeeEstimateUSD={gasFeeEstimateUSD}
        transactionError={transactionError}
        setTransactionError={setTransactionError}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
      />
    </Flex>
  )
}

function CreatePositionFlow({
  currencyInputs,
  setCurrencyInputs,
}: {
  currencyInputs: { tokenA: Maybe<Currency>; tokenB: Maybe<Currency> }
  setCurrencyInputs: Dispatch<SetStateAction<{ tokenA: Maybe<Currency>; tokenB: Maybe<Currency> }>>
}) {
  const { step, setStep } = useCreateLiquidityContext()
  const [localStep, setLocalStep] = useState(step)

  useEffect(() => {
    if (step === PositionFlowStep.PRICE_RANGE) {
      setStep(PositionFlowStep.DEPOSIT)
    }
  }, [step, setStep])

  if (localStep === PositionFlowStep.SELECT_TOKENS_AND_FEE_TIER) {
    return (
      <SelectTokensStep
        currencyInputs={currencyInputs}
        setCurrencyInputs={setCurrencyInputs}
        onContinue={() => {
          setStep(PositionFlowStep.DEPOSIT)
          setLocalStep(PositionFlowStep.DEPOSIT)
        }}
      />
    )
  }

  return (
    <LPTransactionSettingsStoreContextProvider>
      <CreatePositionTxContextProvider>
        <CreatePositionDepositStep
          onBack={() => {
            setLocalStep(PositionFlowStep.SELECT_TOKENS_AND_FEE_TIER)
          }}
        />
      </CreatePositionTxContextProvider>
    </LPTransactionSettingsStoreContextProvider>
  )
}

// eslint-disable-next-line import/no-unused-modules -- used in RouteDefinitions.tsx via lazy import
export default function CreatePositionPage() {
  const { version } = useParams<{ version?: string }>()
  const { search } = useLocation()
  const protocolVersion = getProtocolVersionFromPath(version)
  const {
    defaultInitialToken,
    tokenA,
    tokenB,
    chainId,
    fee,
    hook,
    loading,
    priceRangeState,
    depositState,
    flowStep,
  } = useLiquidityUrlState()

  const defaultStableToken = useMemo(() => getChainInfo(chainId).tokens.stablecoins[0], [chainId])
  const fallbackTokenB = tokenB ?? (tokenA?.equals(defaultStableToken) ? undefined : defaultStableToken)

  const [currencyInputs, setCurrencyInputs] = useState<{ tokenA: Maybe<Currency>; tokenB: Maybe<Currency> }>({
    tokenA: tokenA ?? defaultInitialToken,
    tokenB: fallbackTokenB,
  })

  useEffect(() => {
    if (loading) {
      return
    }

    const nextTokenA = tokenA ?? defaultInitialToken
    const nextTokenB = tokenB ?? (nextTokenA.equals(defaultStableToken) ? undefined : defaultStableToken)

    setCurrencyInputs((prev) => {
      if (areSameCurrency(prev.tokenA, nextTokenA) && areSameCurrency(prev.tokenB, nextTokenB)) {
        return prev
      }

      return {
        tokenA: nextTokenA,
        tokenB: nextTokenB,
      }
    })
  }, [loading, tokenA, tokenB, defaultInitialToken, defaultStableToken])

  const initialFlowStep = useMemo(() => {
    return flowStep === PositionFlowStep.SELECT_TOKENS_AND_FEE_TIER ? flowStep : PositionFlowStep.DEPOSIT
  }, [flowStep])

  if (loading) {
    return null
  }

  // Keep v2 as the only supported entry in this surface.
  if (!version || !protocolVersion) {
    return <Navigate to={`/positions/create/v2${search}`} replace />
  }

  return (
    <Flex py="$spacing24" px="$spacing40" $lg={{ px: '$spacing20' }} width="100%">
      <CreateLiquidityContextProvider
        currencyInputs={currencyInputs}
        setCurrencyInputs={setCurrencyInputs}
        defaultInitialToken={defaultInitialToken}
        initialPositionState={{
          protocolVersion,
          fee: fee ?? undefined,
          hook: hook ?? undefined,
        }}
        initialPriceRangeState={priceRangeState}
        initialDepositState={depositState}
        initialFlowStep={initialFlowStep}
      >
        <CreatePositionFlow currencyInputs={currencyInputs} setCurrencyInputs={setCurrencyInputs} />
      </CreateLiquidityContextProvider>
    </Flex>
  )
}
