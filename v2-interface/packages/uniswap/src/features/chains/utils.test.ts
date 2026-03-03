import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getEnabledChains } from 'uniswap/src/features/chains/utils'

describe('getEnabledChains', () => {
  it('forces testnet mode when only Kasane is feature-flagged', () => {
    const result = getEnabledChains({
      isTestnetModeEnabled: false,
      featureFlaggedChainIds: [UniverseChainId.Kasane],
    })

    expect(result.isTestnetModeEnabled).toBe(true)
    expect(result.defaultChainId).toBe(UniverseChainId.Kasane)
    expect(result.chains).toEqual([UniverseChainId.Kasane])
  })

  it('keeps explicit mode when includeTestnets is true', () => {
    const result = getEnabledChains({
      includeTestnets: true,
      isTestnetModeEnabled: false,
      featureFlaggedChainIds: [UniverseChainId.Kasane],
    })

    expect(result.isTestnetModeEnabled).toBe(false)
    expect(result.chains).toEqual([UniverseChainId.Kasane])
  })
})
