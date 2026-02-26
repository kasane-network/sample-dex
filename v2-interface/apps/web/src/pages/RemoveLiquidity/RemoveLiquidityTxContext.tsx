import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import type { Currency } from '@uniswap/sdk-core'
import { CurrencyAmount } from '@uniswap/sdk-core'
import type { TradingApi } from '@universe/api'
import { useRemoveLiquidityTxAndGasInfo } from 'pages/RemoveLiquidity/hooks/useRemoveLiquidityTxAndGasInfo'
import { useRemoveLiquidityModalContext } from 'pages/RemoveLiquidity/RemoveLiquidityModalContext'
import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ValidatedDecreasePositionTxAndGasInfo } from 'uniswap/src/features/transactions/liquidity/types'
import { LiquidityTransactionType } from 'uniswap/src/features/transactions/liquidity/types'
import { validateTransactionRequest } from 'uniswap/src/features/transactions/swap/utils/trade'
import { DEFAULT_CUSTOM_DEADLINE } from 'uniswap/src/constants/transactions'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useTransactionSettingsStore } from 'uniswap/src/features/transactions/components/settings/stores/transactionSettingsStore/useTransactionSettingsStore'
import { useWallet } from 'uniswap/src/features/wallet/hooks/useWallet'
import { logContextUpdate } from 'utilities/src/logger/contextEnhancer'
import { getAddress, Interface } from 'ethers/lib/utils'

export type RemoveLiquidityTxInfo = {
  gasFeeEstimateUSD?: CurrencyAmount<Currency>
  v2LpTokenApproval?: TradingApi.CheckApprovalLPResponse
  decreaseCalldata?: TradingApi.DecreaseLPPositionResponse
  decreaseCalldataLoading: boolean
  approvalLoading: boolean
  txContext?: ValidatedDecreasePositionTxAndGasInfo
  error: boolean | string
  refetch?: () => void
}

const RemoveLiquidityTxContext = createContext<RemoveLiquidityTxInfo | undefined>(undefined)

const KASANE_V2_ROUTER02_ADDRESS = '0xe5455e558b8701a32b12f8881ff72a35d771b672'
const MAX_UINT256_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

const ERC20_INTERFACE = new Interface(['function approve(address spender, uint256 value) returns (bool)'])
const V2_ROUTER02_INTERFACE = new Interface([
  'function removeLiquidity(address tokenA,address tokenB,uint liquidity,uint amountAMin,uint amountBMin,address to,uint deadline)',
  'function removeLiquidityETH(address token,uint liquidity,uint amountTokenMin,uint amountETHMin,address to,uint deadline)',
])

function getSlippageBps(slippageTolerancePercent?: number): bigint {
  const percent = slippageTolerancePercent ?? 0.5
  const bps = Math.floor(percent * 100)
  const clamped = Math.max(0, Math.min(10_000, bps))
  return BigInt(clamped)
}

function applySlippageDown(amount: bigint, bps: bigint): bigint {
  return (amount * (10_000n - bps)) / 10_000n
}

export function RemoveLiquidityTxContextProvider({ children }: PropsWithChildren): JSX.Element {
  const account = useWallet().evmAccount
  const { positionInfo, percent, currencies } = useRemoveLiquidityModalContext()
  const { customDeadline, customSlippageTolerance } = useTransactionSettingsStore((s) => ({
    customDeadline: s.customDeadline,
    customSlippageTolerance: s.customSlippageTolerance,
  }))

  const removeLiquidityTxInfo = useRemoveLiquidityTxAndGasInfo({ account: account?.address })
  const { error, refetch } = removeLiquidityTxInfo
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    logContextUpdate('RemoveLiquidityTxContext', removeLiquidityTxInfo)
  }, [removeLiquidityTxInfo])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000))
    }, 15_000)
    return () => clearInterval(intervalId)
  }, [])

  const currency0 = currencies?.TOKEN0
  const currency1 = currencies?.TOKEN1

  const localV2TxContext = useMemo((): ValidatedDecreasePositionTxAndGasInfo | undefined => {
    if (
      !positionInfo ||
      !account?.address ||
      !currency0 ||
      !currency1 ||
      !positionInfo.liquidityToken ||
      !positionInfo.liquidityAmount ||
      !percent
    ) {
      return undefined
    }

    if (positionInfo.version !== ProtocolVersion.V2 || positionInfo.chainId !== UniverseChainId.Kasane) {
      return undefined
    }

    const routerAddress = getAddress(KASANE_V2_ROUTER02_ADDRESS)
    const recipient = getAddress(account.address)
    const slippageBps = getSlippageBps(customSlippageTolerance)
    const deadlineSeconds = nowSeconds + (customDeadline ?? DEFAULT_CUSTOM_DEADLINE) * 60

    const percentBigInt = BigInt(percent)
    const liquidityRaw = BigInt(positionInfo.liquidityAmount.quotient.toString())
    const amount0Raw = BigInt(positionInfo.currency0Amount.quotient.toString())
    const amount1Raw = BigInt(positionInfo.currency1Amount.quotient.toString())

    const liquidityToRemoveRaw = (liquidityRaw * percentBigInt) / 100n
    const amount0ToRemoveRaw = (amount0Raw * percentBigInt) / 100n
    const amount1ToRemoveRaw = (amount1Raw * percentBigInt) / 100n
    const amount0MinRaw = applySlippageDown(amount0ToRemoveRaw, slippageBps)
    const amount1MinRaw = applySlippageDown(amount1ToRemoveRaw, slippageBps)

    let txData: string

    if (currency0.isNative || currency1.isNative) {
      const token = currency0.isNative ? currency1 : currency0
      const tokenAmountMin = currency0.isNative ? amount1MinRaw : amount0MinRaw
      const nativeAmountMin = currency0.isNative ? amount0MinRaw : amount1MinRaw

      txData = V2_ROUTER02_INTERFACE.encodeFunctionData('removeLiquidityETH', [
        getAddress(token.wrapped.address),
        liquidityToRemoveRaw.toString(),
        tokenAmountMin.toString(),
        nativeAmountMin.toString(),
        recipient,
        deadlineSeconds,
      ])
    } else {
      txData = V2_ROUTER02_INTERFACE.encodeFunctionData('removeLiquidity', [
        getAddress(currency0.wrapped.address),
        getAddress(currency1.wrapped.address),
        liquidityToRemoveRaw.toString(),
        amount0MinRaw.toString(),
        amount1MinRaw.toString(),
        recipient,
        deadlineSeconds,
      ])
    }

    const approvePositionTokenRequest = validateTransactionRequest({
      chainId: positionInfo.chainId,
      from: recipient,
      to: getAddress(positionInfo.liquidityToken.address),
      data: ERC20_INTERFACE.encodeFunctionData('approve', [routerAddress, MAX_UINT256_HEX]),
      value: '0',
    })
    const txRequest = validateTransactionRequest({
      chainId: positionInfo.chainId,
      from: recipient,
      to: routerAddress,
      data: txData,
      value: '0',
    })

    if (!approvePositionTokenRequest || !txRequest) {
      return undefined
    }

    return {
      type: LiquidityTransactionType.Decrease,
      canBatchTransactions: false,
      action: {
        type: LiquidityTransactionType.Decrease,
        currency0Amount: CurrencyAmount.fromRawAmount(currency0, amount0ToRemoveRaw.toString()),
        currency1Amount: CurrencyAmount.fromRawAmount(currency1, amount1ToRemoveRaw.toString()),
        liquidityToken: positionInfo.liquidityToken,
      },
      approvePositionTokenRequest,
      txRequest,
      approveToken0Request: undefined,
      approveToken1Request: undefined,
      revokeToken0Request: undefined,
      revokeToken1Request: undefined,
      token0PermitTransaction: undefined,
      token1PermitTransaction: undefined,
      positionTokenPermitTransaction: undefined,
      permit: undefined,
      sqrtRatioX96: undefined,
    }
  }, [account?.address, currency0, currency1, customDeadline, customSlippageTolerance, nowSeconds, percent, positionInfo])

  return (
    <RemoveLiquidityTxContext.Provider
      value={{
        ...removeLiquidityTxInfo,
        txContext: localV2TxContext,
        error,
        refetch,
      }}
    >
      {children}
    </RemoveLiquidityTxContext.Provider>
  )
}

export const useRemoveLiquidityTxContext = (): RemoveLiquidityTxInfo => {
  const removeContext = useContext(RemoveLiquidityTxContext)

  if (removeContext === undefined) {
    throw new Error('`useRemoveLiquidityTxContext` must be used inside of `RemoveLiquidityTxContextProvider`')
  }

  return removeContext
}
