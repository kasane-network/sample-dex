import { getOverrideAdapter, getStatsigEnvName, StatsigOptions } from '@universe/gating'
import { uniswapUrls } from 'uniswap/src/constants/urls'

export function shouldDisableStatsigNetwork(apiUrl: string): boolean {
  return apiUrl.startsWith('/__disabled_api__')
}

export const statsigBaseConfig: StatsigOptions = {
  networkConfig: {
    api: uniswapUrls.statsigProxyUrl,
    preventAllNetworkTraffic: shouldDisableStatsigNetwork(uniswapUrls.statsigProxyUrl),
  },
  environment: {
    tier: getStatsigEnvName(),
  },
  overrideAdapter: getOverrideAdapter(),
}
