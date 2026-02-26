import { createTradingApiClient, TradingApi } from '@universe/api'
import { TRADING_API_PATHS } from '@universe/api/src/clients/trading/createTradingApiClient'
import { config } from 'uniswap/src/config'
import { tradingApiVersionPrefix, uniswapUrls } from 'uniswap/src/constants/urls'
import { createUniswapFetchClient } from 'uniswap/src/data/apiClients/createUniswapFetchClient'

const TradingFetchClient = createUniswapFetchClient({
  baseUrl: uniswapUrls.tradingApiUrl,
  additionalHeaders: {
    'x-api-key': config.tradingApiKey,
  },
})

export enum TradingApiHeaders {
  UniversalRouterVersion = 'x-universal-router-version',
}

export const getFeatureFlaggedHeaders = (
  _tradingApiPath: (typeof TRADING_API_PATHS)[keyof typeof TRADING_API_PATHS],
): HeadersInit => ({
  [TradingApiHeaders.UniversalRouterVersion]: TradingApi.UniversalRouterVersion._2_0,
})

export const getQuoteHeaders = (): Record<string, string> => ({})

export const TradingApiClient = createTradingApiClient({
  fetchClient: TradingFetchClient,
  getFeatureFlagHeaders: getFeatureFlaggedHeaders,
  getApiPathPrefix: () => tradingApiVersionPrefix,
})

export type CheckWalletDelegation = (
  params: TradingApi.WalletCheckDelegationRequestBody,
) => Promise<TradingApi.WalletCheckDelegationResponseBody>

export async function checkWalletDelegation(
  params: TradingApi.WalletCheckDelegationRequestBody,
): Promise<TradingApi.WalletCheckDelegationResponseBody> {
  const { walletAddresses, chainIds } = params

  if (!walletAddresses?.length || !chainIds?.length) {
    return {
      requestId: '',
      delegationDetails: {},
    }
  }

  if (uniswapUrls.tradingApiUrl.startsWith('/__disabled_api__')) {
    return {
      requestId: '',
      delegationDetails: {},
    }
  }

  return await TradingApiClient.checkWalletDelegationWithoutBatching({
    walletAddresses,
    chainIds,
  })
}
