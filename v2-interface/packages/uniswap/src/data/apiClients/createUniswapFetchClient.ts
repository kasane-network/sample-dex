import { createFetchClient, type CustomOptions, type FetchClient, provideSessionService } from '@universe/api'
import { getIsSessionServiceEnabled } from '@universe/gating'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { getVersionHeader } from 'uniswap/src/data/constants'
import { isMobileApp, isWebApp } from 'utilities/src/platform'
import { REQUEST_SOURCE } from 'utilities/src/platform/requestSource'

export const BASE_UNISWAP_HEADERS = {
  'x-request-source': REQUEST_SOURCE,
  ...(!isWebApp ? { 'x-app-version': getVersionHeader() } : {}),
  ...(isMobileApp ? { Origin: uniswapUrls.apiOrigin } : {}),
}

function createDisabledFetchClient(baseUrl: string): FetchClient {
  const createDisabledError = (method: string, path: string): Error =>
    new Error(`External API client is disabled: ${method} ${baseUrl}${path}`)

  return {
    context: () => ({
      baseUrl,
      getSessionService: () =>
        provideSessionService({ getBaseUrl: () => uniswapUrls.apiBaseUrlV2, getIsSessionServiceEnabled }),
    }),
    fetch: async <T = Response>(path: string, _options?: RequestInit): Promise<T> => {
      throw createDisabledError('FETCH', path)
    },
    get: async <T>(path: string, _options?: CustomOptions): Promise<T> => {
      throw createDisabledError('GET', path)
    },
    post: async <T>(path: string, _options: CustomOptions): Promise<T> => {
      throw createDisabledError('POST', path)
    },
    put: async <T>(path: string, _options: CustomOptions): Promise<T> => {
      throw createDisabledError('PUT', path)
    },
    delete: async <T>(path: string, _options: CustomOptions): Promise<T> => {
      throw createDisabledError('DELETE', path)
    },
    patch: async <T>(path: string, _options: CustomOptions): Promise<T> => {
      throw createDisabledError('PATCH', path)
    },
  }
}

export function createUniswapFetchClient({
  baseUrl,
  includeBaseUniswapHeaders = true,
  additionalHeaders = {},
}: {
  baseUrl: string
  includeBaseUniswapHeaders?: boolean
  additionalHeaders?: HeadersInit & {
    'x-uniquote-enabled'?: string
  }
}): FetchClient {
  if (baseUrl.startsWith('/__disabled_api__')) {
    return createDisabledFetchClient(baseUrl)
  }

  const headers = includeBaseUniswapHeaders ? { ...BASE_UNISWAP_HEADERS, ...additionalHeaders } : additionalHeaders

  return createFetchClient({
    baseUrl,
    getHeaders: () => headers,
    getSessionService: () =>
      provideSessionService({ getBaseUrl: () => uniswapUrls.apiBaseUrlV2, getIsSessionServiceEnabled }),
  })
}
