import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useAccount } from 'hooks/useAccount'
import JSBI from 'jsbi'
import { useEffect, useMemo, useRef } from 'react'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { isEVMAddress } from 'utilities/src/addresses/evm/evm'
import { logger } from 'utilities/src/logger/logger'
import { assume0xAddress } from 'utils/wagmi'
import { erc20Abi } from 'viem'
import { useBalance, useReadContracts } from 'wagmi'

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useRpcTokenBalancesWithLoadingIndicator({
  address,
  tokens,
  chainId,
  skip,
}: {
  address?: string
  tokens?: (Token | undefined)[]
  chainId?: number
  skip?: boolean
}): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const validatedTokens: Token[] = useMemo(
    () =>
      skip
        ? []
        : (tokens?.filter((t?: Token): t is Token => isEVMAddress(t?.address) !== false && t.chainId === chainId) ??
          []),
    [chainId, tokens, skip],
  )

  const { data, isLoading: balancesLoading } = useReadContracts({
    contracts: useMemo(
      () =>
        validatedTokens.map(
          (token) =>
            ({
              address: assume0xAddress(token.address),
              chainId: token.chainId,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            }) as const,
        ),
      [address, chainId, validatedTokens],
    ),
    query: { enabled: !!address && !!chainId },
  })
  const lastLogKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!address || !chainId || !tokens?.length) {
      return
    }

    if (!balancesLoading && !data?.length) {
      const logKey = `${address}-${chainId}-empty-token-balances`
      if (lastLogKeyRef.current === logKey) {
        return
      }
      lastLogKeyRef.current = logKey
      logger.warn('useCurrencyBalance', 'useRpcTokenBalancesWithLoadingIndicator', 'No token balances returned', {
        address,
        chainId,
        tokenCount: tokens.length,
      })
    }
  }, [address, balancesLoading, chainId, data, tokens])

  return useMemo(
    () => [
      address && validatedTokens.length > 0
        ? // eslint-disable-next-line max-params
          validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token, i) => {
            const value = data?.[i].result
            if (!value) {
              return memo
            }

            const amount = value ? JSBI.BigInt(value.toString()) : undefined
            if (amount) {
              memo[token.address.toLowerCase()] = CurrencyAmount.fromRawAmount(token, amount)
            }
            return memo
          }, {})
        : {},
      balancesLoading,
    ],
    [address, validatedTokens, balancesLoading, data],
  )
}

function useRpcTokenBalances(
  address?: string,
  tokens?: (Token | undefined)[],
  chainId?: number,
): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
  return useRpcTokenBalancesWithLoadingIndicator({ address, tokens, chainId })[0]
}

function useRpcCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[],
): (CurrencyAmount<Currency> | undefined)[] {
  const { chainId: connectedChainId } = useAccount()
  const activeChainId = UniverseChainId.Kasane
  const chainDebugKeyRef = useRef<string | null>(null)

  const tokens = useMemo(
    () =>
      currencies?.filter(
        (currency): currency is Token =>
          currency !== undefined && currency !== null && currency.isToken && currency.chainId === UniverseChainId.Kasane,
      ) ?? [],
    [currencies],
  )

  const tokenBalances = useRpcTokenBalances(account, tokens, activeChainId)
  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const { data: nativeBalance } = useBalance({
    address: assume0xAddress(account),
    chainId: activeChainId,
    query: { enabled: containsETH && !!account && !!activeChainId },
  })

  useEffect(() => {
    if (!account || !currencies?.length) {
      return
    }

    if (!connectedChainId || connectedChainId === UniverseChainId.Kasane) {
      return
    }

    const currencyChainIds = currencies
      .filter((currency): currency is Currency => Boolean(currency))
      .map((currency) => currency.chainId)
    const logKey = `${account}-${currencyChainIds.join(',')}-non-kasane-chain`
    if (chainDebugKeyRef.current === logKey) {
      return
    }
    chainDebugKeyRef.current = logKey
    logger.warn('useCurrencyBalance', 'useRpcCurrencyBalances', 'Non-Kasane chain connected in Kasane-only build', {
      account,
      connectedChainId,
      currencyChainIds,
    })
  }, [account, connectedChainId, currencies])

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency) {
          return undefined
        }

        if (currency.chainId !== UniverseChainId.Kasane) {
          return undefined
        }

        if (currency.isToken) {
          return tokenBalances[currency.address.toLowerCase()]
        } else if (nativeBalance?.value) {
          return CurrencyAmount.fromRawAmount(currency, nativeBalance.value.toString())
        } else {
          return undefined
        }
      }) ?? [],
    [account, connectedChainId, currencies, nativeBalance?.value, tokenBalances],
  )
}

/**
 * @deprecated use usePortfolioBalances & getOnChainBalancesFetch from packages/uniswap instead
 *
 * Returns balances for tokens on currently-connected chainId via RPC.
 */
export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[],
): (CurrencyAmount<Currency> | undefined)[] {
  const rpcCurrencyBalances = useRpcCurrencyBalances(account, currencies)

  return useMemo(() => {
    if (!account || !currencies) {
      return []
    }

    return rpcCurrencyBalances
  }, [account, currencies, rpcCurrencyBalances])
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): CurrencyAmount<Token> | undefined {
  return useCurrencyBalance(account, token) as CurrencyAmount<Token> | undefined
}

export default function useCurrencyBalance(
  account?: string,
  currency?: Currency,
): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalances(
    account,
    useMemo(() => [currency], [currency]),
  )[0]
}
