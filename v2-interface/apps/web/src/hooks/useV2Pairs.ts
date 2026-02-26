import { Currency, CurrencyAmount, V2_FACTORY_ADDRESSES } from '@uniswap/sdk-core'
import { computePairAddress, Pair } from '@uniswap/v2-sdk'
import { useMemo } from 'react'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { assume0xAddress } from 'utils/wagmi'
import { useReadContracts } from 'wagmi'

const KASANE_V2_FACTORY_ADDRESS = '0x697c9e9ea0686515fea69f526f85b48d8569ec86'

function isLpDebugEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true
  }
  return typeof window !== 'undefined' && window.localStorage.getItem('debug_lp') === '1'
}

function getV2FactoryAddress(chainId: number): string | undefined {
  if (chainId === UniverseChainId.Kasane) {
    return KASANE_V2_FACTORY_ADDRESS
  }
  return V2_FACTORY_ADDRESSES[chainId]
}

export enum PairState {
  LOADING = 0,
  NOT_EXISTS = 1,
  EXISTS = 2,
  INVALID = 3,
}

export function useV2Pairs(currencies: [Maybe<Currency>, Maybe<Currency>][]): [PairState, Pair | null][] {
  const chainId = currencies[0]?.[0]?.chainId
  const tokens = useMemo(
    () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
    [currencies],
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        const factoryAddress = tokenA ? getV2FactoryAddress(tokenA.chainId) : undefined
        if (isLpDebugEnabled() && tokenA && tokenB && tokenA.chainId === tokenB.chainId && !factoryAddress) {
          console.info('[LP_DEBUG][useV2Pairs]', {
            state: 'MISSING_FACTORY',
            chainId: tokenA.chainId,
            tokenA: tokenA.address,
            tokenB: tokenB.address,
          })
        }
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) &&
          factoryAddress
          ? computePairAddress({ factoryAddress, tokenA, tokenB })
          : undefined
      }),
    [tokens],
  )

  const { data, isLoading } = useReadContracts({
    contracts: useMemo(() => {
      return pairAddresses.map(
        (pairAddress) =>
          ({
            address: assume0xAddress(pairAddress) ?? '0x', // Edge case: if an address is undefined, we pass in a blank address to keep the result array the same length as pairAddresses
            abi: [
              {
                constant: true,
                inputs: [],
                name: 'getReserves',
                outputs: [
                  {
                    internalType: 'uint112',
                    name: 'reserve0',
                    type: 'uint112',
                  },
                  {
                    internalType: 'uint112',
                    name: 'reserve1',
                    type: 'uint112',
                  },
                  {
                    internalType: 'uint32',
                    name: 'blockTimestampLast',
                    type: 'uint32',
                  },
                ],
                payable: false,
                stateMutability: 'view',
                type: 'function',
              },
            ],
            functionName: 'getReserves',
            chainId,
          }) as const,
      )
    }, [pairAddresses, chainId]),
  })

  return useMemo(() => {
    if (isLoading) {
      return Array.from({ length: pairAddresses.length }, () => [PairState.LOADING, null])
    }

    return (
      data?.map(({ result }, i) => {
        const tokenA = tokens[i][0]
        const tokenB = tokens[i][1]

        if (!tokenA || !tokenB || tokenA.equals(tokenB)) {
          return [PairState.INVALID, null]
        }

        if (!result) {
          if (isLpDebugEnabled()) {
            console.info('[LP_DEBUG][useV2Pairs]', {
              state: PairState.NOT_EXISTS,
              chainId,
              pairAddress: pairAddresses[i],
              tokenA: tokenA.address,
              tokenB: tokenB.address,
            })
          }
          return [PairState.NOT_EXISTS, null]
        }

        const [reserve0, reserve1] = result
        const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

        const response: [PairState, Pair] = [
          PairState.EXISTS,
          new Pair(
            CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
            CurrencyAmount.fromRawAmount(token1, reserve1.toString()),
          ),
        ]

        if (isLpDebugEnabled()) {
          console.info('[LP_DEBUG][useV2Pairs]', {
            state: PairState.EXISTS,
            chainId,
            pairAddress: pairAddresses[i],
            token0: token0.address,
            token1: token1.address,
            reserve0: reserve0.toString(),
            reserve1: reserve1.toString(),
          })
        }

        return response
      }) ?? []
    )
  }, [chainId, data, isLoading, pairAddresses, tokens])
}

export function useV2Pair(tokenA?: Maybe<Currency>, tokenB?: Maybe<Currency>): [PairState, Pair | null] {
  const inputs: [[Maybe<Currency>, Maybe<Currency>]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
  const v2Pairs = useV2Pairs(inputs)
  return v2Pairs.length ? v2Pairs[0] : [PairState.NOT_EXISTS, null]
}
