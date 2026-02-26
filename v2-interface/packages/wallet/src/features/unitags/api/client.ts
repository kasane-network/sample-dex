import { createUnitagsApiClient } from '@universe/api'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { createUniswapFetchClient } from 'uniswap/src/data/apiClients/createUniswapFetchClient'

export const unitagsApiClient = createUnitagsApiClient({
  fetchClient: createUniswapFetchClient({ baseUrl: uniswapUrls.unitagsApiUrl }),
})
