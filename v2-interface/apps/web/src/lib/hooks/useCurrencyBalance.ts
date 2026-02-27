import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useAccount } from 'hooks/useAccount'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { isEVMAddress } from 'utilities/src/addresses/evm/evm'
import { assume0xAddress } from 'utils/wagmi'
import { erc20Abi } from 'viem'
import { useBalance, useReadContracts } from 'wagmi'

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useRpcTokenBalancesWithLoadingIndicator({
  address,
  tokens,
  skip,
}: {
  address?: string
  tokens?: (Token | undefined)[]
  skip?: boolean
}): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const { chainId } = useAccount()
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
              chainId,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            }) as const,
        ),
      [address, chainId, validatedTokens],
    ),
    query: { enabled: !!address },
  })

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
              memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
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
): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
  return useRpcTokenBalancesWithLoadingIndicator({ address, tokens })[0]
}

function useRpcCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[],
): (CurrencyAmount<Currency> | undefined)[] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [],
    [currencies],
  )

  const { chainId } = useAccount()
  const tokenBalances = useRpcTokenBalances(account, tokens)
  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const { data: nativeBalance } = useBalance({
    address: assume0xAddress(account),
    chainId,
    query: { enabled: containsETH && !!account },
  })

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency || currency.chainId !== chainId) {
          return undefined
        }

        if (currency.isToken) {
          return tokenBalances[currency.address]
        } else if (nativeBalance?.value) {
          return CurrencyAmount.fromRawAmount(currency, nativeBalance.value.toString())
        } else {
          return undefined
        }
      }) ?? [],
    [account, chainId, currencies, nativeBalance?.value, tokenBalances],
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
