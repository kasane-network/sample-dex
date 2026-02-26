import { UniverseChainId } from 'uniswap/src/features/chains/types'
export const getFeatureFlaggedChainIds = createGetFeatureFlaggedChainIds()

// Used to feature flag chains. If a chain is not included in the object, it is considered enabled by default.
export function useFeatureFlaggedChainIds(): UniverseChainId[] {
  return [UniverseChainId.Kasane]
}

export function createGetFeatureFlaggedChainIds(): () => UniverseChainId[] {
  return () => [UniverseChainId.Kasane]
}
