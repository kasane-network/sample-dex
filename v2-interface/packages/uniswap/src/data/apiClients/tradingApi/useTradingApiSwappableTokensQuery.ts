import type { QueryClient, QueryFunction, QueryKey, UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryApiHelperHookArgs } from '@universe/api'
import { type SwappableTokensParams, TradingApi } from '@universe/api'
import { useEffect } from 'react'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import type { TradeableAsset } from 'uniswap/src/entities/assets'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import {
  getTokenAddressFromChainForTradingApi,
  toTradingApiSupportedChainId,
  tradingApiToUniverseChainId,
} from 'uniswap/src/features/transactions/swap/utils/tradingApi'
import { logger } from 'utilities/src/logger/logger'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import { MAX_REACT_QUERY_CACHE_TIME_MS } from 'utilities/src/time/time'

export function useTradingApiSwappableTokensQuery({
  params,
  ...rest
}: UseQueryApiHelperHookArgs<
  SwappableTokensParams,
  TradingApi.GetSwappableTokensResponse
>): UseQueryResult<TradingApi.GetSwappableTokensResponse> {
  const queryKey = swappableTokensQueryKey(params)

  return useQuery<TradingApi.GetSwappableTokensResponse>({
    queryKey,
    queryFn: params ? swappableTokensQueryFn(params) : skipToken,
    // In order for `getSwappableTokensQueryData` to be more likely to have cached data,
    // we set the `gcTime` to the longest possible time.
    gcTime: MAX_REACT_QUERY_CACHE_TIME_MS,
    ...rest,
  })
}

// Synchronous way of reading the cached data for this query.
// It will return `undefined` if the data is not cached.
export function getSwappableTokensQueryData({
  queryClient,
  params,
}: {
  queryClient: QueryClient
  params: SwappableTokensParams
}): TradingApi.GetSwappableTokensResponse | undefined {
  return queryClient.getQueryData(swappableTokensQueryKey(params))
}

export function usePrefetchSwappableTokens(input: Maybe<TradeableAsset>): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const prefetchSwappableTokens = async (): Promise<void> => {
      const tokenIn = input?.address ? getTokenAddressFromChainForTradingApi(input.address, input.chainId) : undefined
      const tokenInChainId = toTradingApiSupportedChainId(input?.chainId)
      if (!tokenIn || !tokenInChainId) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey: swappableTokensQueryKey({
          tokenIn,
          tokenInChainId,
        }),
        queryFn: swappableTokensQueryFn({
          tokenIn,
          tokenInChainId,
        }),
        // In order for `getSwappableTokensQueryData` to be more likely to have cached data,
        // we set the `gcTime` to the longest possible time.
        gcTime: MAX_REACT_QUERY_CACHE_TIME_MS,
      })
    }

    prefetchSwappableTokens().catch((e) => {
      logger.error(e, {
        tags: { file: 'useTradingApiSwappableTokensQuery', function: 'prefetchSwappableTokens' },
      })
    })
  }, [input, queryClient])
}

const swappableTokensQueryKey = (params?: SwappableTokensParams): QueryKey => {
  return [ReactQueryCacheKey.TradingApi, uniswapUrls.tradingApiPaths.swappableTokens, params]
}

const swappableTokensQueryFn = (
  params: SwappableTokensParams,
): QueryFunction<TradingApi.GetSwappableTokensResponse, QueryKey, never> | undefined => {
  return async (): Promise<TradingApi.GetSwappableTokensResponse> => {
    return buildLocalSwappableTokensResponse(params)
  }
}

function buildLocalSwappableTokensResponse(params: SwappableTokensParams): TradingApi.GetSwappableTokensResponse {
  const universeChainId = tradingApiToUniverseChainId(params.tokenInChainId)
  const tokens =
    universeChainId === undefined
      ? []
      : [
          {
            address: getTokenAddressFromChainForTradingApi(
              getChainInfo(universeChainId).nativeCurrency.address,
              universeChainId,
            ),
            chainId: params.tokenInChainId,
            name: getChainInfo(universeChainId).nativeCurrency.name,
            symbol: getChainInfo(universeChainId).nativeCurrency.symbol,
            decimals: getChainInfo(universeChainId).nativeCurrency.decimals,
            project: {
              logo: null,
              safetyLevel: TradingApi.SafetyLevel.VERIFIED,
              isSpam: false,
            },
            isSpam: false,
          },
        ]

  return {
    requestId: 'local-fallback',
    tokens,
  }
}
