import { shouldDisableStatsigNetwork } from 'uniswap/src/features/gating/statsigBaseConfig'

describe('shouldDisableStatsigNetwork', () => {
  it('returns true for disabled api path', () => {
    expect(shouldDisableStatsigNetwork('/__disabled_api__/v1/statsig-proxy')).toBe(true)
  })

  it('returns false for normal api url', () => {
    expect(shouldDisableStatsigNetwork('https://api.statsig.com/v1')).toBe(false)
  })
})
