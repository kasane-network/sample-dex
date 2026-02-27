import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { Token } from '@uniswap/sdk-core'
import { BackendApi } from '@universe/api'
import { PollingInterval } from 'uniswap/src/constants/misc'
import { ALL_CHAIN_IDS, getChainInfo, ORDERED_CHAINS } from 'uniswap/src/features/chains/chainInfo'
import { EnabledChainsInfo, GqlChainId, NetworkLayer, UniverseChainId } from 'uniswap/src/features/chains/types'
import { Platform } from 'uniswap/src/features/platforms/types/Platform'

// Some code from the web app uses chainId types as numbers
// This validates them as coerces into SupportedChainId
export function toSupportedChainId(chainId?: BigNumberish): UniverseChainId | null {
  if (!chainId || !ALL_CHAIN_IDS.map((c) => c.toString()).includes(chainId.toString())) {
    return null
  }
  return parseInt(chainId.toString(), 10) as UniverseChainId
}

export function getChainLabel(chainId: UniverseChainId): string {
  return getChainInfo(chainId).label
}

/**
 * Return the explorer name for the given chain ID
 * @param chainId the ID of the chain for which to return the explorer name
 */
export function getChainExplorerName(chainId: UniverseChainId): string {
  return getChainInfo(chainId).explorer.name
}

export function isTestnetChain(chainId: UniverseChainId): boolean {
  return Boolean(getChainInfo(chainId).testnet)
}

export function isBackendSupportedChainId(chainId: UniverseChainId): boolean {
  const info = getChainInfo(chainId)
  return info.backendChain.backendSupported
}

export function isBackendSupportedChain(chain: BackendApi.Chain): chain is GqlChainId {
  const chainId = fromGraphQLChain(chain)
  if (!chainId) {
    return false
  }

  return isBackendSupportedChainId(chainId)
}

export function chainIdToHexadecimalString(chainId: UniverseChainId): string {
  return BigNumber.from(chainId).toHexString()
}

export function hexadecimalStringToInt(hex: string): number {
  return parseInt(hex, 16)
}

export function isL2ChainId(chainId?: UniverseChainId): boolean {
  return chainId !== undefined && getChainInfo(chainId).networkLayer === NetworkLayer.L2
}

export function isMainnetChainId(chainId?: UniverseChainId): boolean {
  return chainId === UniverseChainId.Mainnet || chainId === UniverseChainId.Sepolia
}

export function toGraphQLChain(chainId: UniverseChainId): GqlChainId {
  return getChainInfo(chainId).backendChain.chain
}

export function fromGraphQLChain(chain: BackendApi.Chain | string | undefined): UniverseChainId | null {
  switch (chain) {
    case BackendApi.Chain.Ethereum:
      return UniverseChainId.Mainnet
    case BackendApi.Chain.Arbitrum:
      return UniverseChainId.ArbitrumOne
    case BackendApi.Chain.Avalanche:
      return UniverseChainId.Avalanche
    case BackendApi.Chain.Base:
      return UniverseChainId.Base
    case BackendApi.Chain.Bnb:
      return UniverseChainId.Bnb
    case BackendApi.Chain.Blast:
      return UniverseChainId.Blast
    case BackendApi.Chain.Celo:
      return UniverseChainId.Celo
    case BackendApi.Chain.Monad:
      return UniverseChainId.Monad
    case BackendApi.Chain.Optimism:
      return UniverseChainId.Optimism
    case BackendApi.Chain.Polygon:
      return UniverseChainId.Polygon
    case BackendApi.Chain.EthereumSepolia:
      return UniverseChainId.Sepolia
    case BackendApi.Chain.MonadTestnet:
      return UniverseChainId.Kasane
    case BackendApi.Chain.Unichain:
      return UniverseChainId.Unichain
    case BackendApi.Chain.Solana:
      return UniverseChainId.Solana
    case BackendApi.Chain.Soneium:
      return UniverseChainId.Soneium
    case BackendApi.Chain.AstrochainSepolia:
      return UniverseChainId.UnichainSepolia
    case BackendApi.Chain.Worldchain:
      return UniverseChainId.WorldChain
    case BackendApi.Chain.Zksync:
      return UniverseChainId.Zksync
    case BackendApi.Chain.Zora:
      return UniverseChainId.Zora
  }

  return null
}

export function getPollingIntervalByBlocktime(chainId?: UniverseChainId): PollingInterval {
  return isMainnetChainId(chainId) ? PollingInterval.Fast : PollingInterval.LightningMcQueen
}

export function fromUniswapWebAppLink(network: string | null): UniverseChainId {
  switch (network) {
    case BackendApi.Chain.Ethereum.toLowerCase():
      return UniverseChainId.Mainnet
    case BackendApi.Chain.Arbitrum.toLowerCase():
      return UniverseChainId.ArbitrumOne
    case BackendApi.Chain.Avalanche.toLowerCase():
      return UniverseChainId.Avalanche
    case BackendApi.Chain.Base.toLowerCase():
      return UniverseChainId.Base
    case BackendApi.Chain.Blast.toLowerCase():
      return UniverseChainId.Blast
    case BackendApi.Chain.Bnb.toLowerCase():
      return UniverseChainId.Bnb
    case BackendApi.Chain.Celo.toLowerCase():
      return UniverseChainId.Celo
    case BackendApi.Chain.Monad.toLowerCase():
      return UniverseChainId.Monad
    case BackendApi.Chain.Optimism.toLowerCase():
      return UniverseChainId.Optimism
    case BackendApi.Chain.Polygon.toLowerCase():
      return UniverseChainId.Polygon
    case BackendApi.Chain.EthereumSepolia.toLowerCase():
      return UniverseChainId.Sepolia
    case BackendApi.Chain.MonadTestnet.toLowerCase():
      return UniverseChainId.Kasane
    case BackendApi.Chain.Unichain.toLowerCase():
      return UniverseChainId.Unichain
    case BackendApi.Chain.Soneium.toLowerCase():
      return UniverseChainId.Soneium
    case BackendApi.Chain.AstrochainSepolia.toLowerCase():
      return UniverseChainId.UnichainSepolia
    case BackendApi.Chain.Worldchain.toLowerCase():
      return UniverseChainId.WorldChain
    case BackendApi.Chain.Zksync.toLowerCase():
      return UniverseChainId.Zksync
    case BackendApi.Chain.Zora.toLowerCase():
      return UniverseChainId.Zora
    default:
      throw new Error(`Network "${network}" can not be mapped`)
  }
}

export function toUniswapWebAppLink(chainId: UniverseChainId): string | null {
  switch (chainId) {
    case UniverseChainId.Mainnet:
      return BackendApi.Chain.Ethereum.toLowerCase()
    case UniverseChainId.ArbitrumOne:
      return BackendApi.Chain.Arbitrum.toLowerCase()
    case UniverseChainId.Avalanche:
      return BackendApi.Chain.Avalanche.toLowerCase()
    case UniverseChainId.Base:
      return BackendApi.Chain.Base.toLowerCase()
    case UniverseChainId.Blast:
      return BackendApi.Chain.Blast.toLowerCase()
    case UniverseChainId.Bnb:
      return BackendApi.Chain.Bnb.toLowerCase()
    case UniverseChainId.Celo:
      return BackendApi.Chain.Celo.toLowerCase()
    case UniverseChainId.Monad:
      return BackendApi.Chain.Monad.toLowerCase()
    case UniverseChainId.Optimism:
      return BackendApi.Chain.Optimism.toLowerCase()
    case UniverseChainId.Polygon:
      return BackendApi.Chain.Polygon.toLowerCase()
    case UniverseChainId.Sepolia:
      return BackendApi.Chain.EthereumSepolia.toLowerCase()
    case UniverseChainId.Kasane:
      return BackendApi.Chain.MonadTestnet.toLowerCase()
    case UniverseChainId.Unichain:
      return BackendApi.Chain.Unichain.toLowerCase()
    case UniverseChainId.Soneium:
      return BackendApi.Chain.Soneium.toLowerCase()
    case UniverseChainId.UnichainSepolia:
      return BackendApi.Chain.AstrochainSepolia.toLowerCase()
    case UniverseChainId.WorldChain:
      return BackendApi.Chain.Worldchain.toLowerCase()
    case UniverseChainId.Zksync:
      return BackendApi.Chain.Zksync.toLowerCase()
    case UniverseChainId.Zora:
      return BackendApi.Chain.Zora.toLowerCase()
    default:
      throw new Error(`ChainID "${chainId}" can not be mapped`)
  }
}

export function filterChainIdsByFeatureFlag(
  featureFlaggedChainIds: {
    [key in UniverseChainId]?: boolean
  },
): UniverseChainId[] {
  return ALL_CHAIN_IDS.filter((chainId) => {
    return featureFlaggedChainIds[chainId] ?? true
  })
}

/**
 * Filters chain IDs by platform (EVM or SVM)
 * @param chainIds Array of chain IDs to filter (as numbers)
 * @param platform Platform to filter by (EVM or SVM)
 * @returns Filtered array of chain IDs matching the specified platform
 */
export function filterChainIdsByPlatform<T extends number>(chainIds: T[], platform: Platform): T[] {
  return chainIds.filter<T>((chainId): chainId is T => {
    const universeChainId = chainId as UniverseChainId
    if (!ALL_CHAIN_IDS.includes(universeChainId)) {
      return false
    }
    const chainInfo = getChainInfo(universeChainId)
    return chainInfo.platform === platform
  })
}

export function getEnabledChains({
  platform,
  /**
   * When `true`, it will return all enabled chains, including testnets.
   */
  includeTestnets = false,
  isTestnetModeEnabled,
  featureFlaggedChainIds,
}: {
  platform?: Platform
  isTestnetModeEnabled: boolean
  featureFlaggedChainIds: UniverseChainId[]
  includeTestnets?: boolean
}): EnabledChainsInfo {
  const enabledChainInfos = ORDERED_CHAINS.filter((chainInfo) => {
    // Filter by platform
    if (platform !== undefined && platform !== chainInfo.platform) {
      return false
    }

    // Filter by testnet mode
    if (!includeTestnets && isTestnetModeEnabled !== isTestnetChain(chainInfo.id)) {
      return false
    }

    // Filter by feature flags
    if (!featureFlaggedChainIds.includes(chainInfo.id)) {
      return false
    }

    return true
  })

  // Extract chain IDs and GQL chains from filtered results
  const chains = enabledChainInfos.map((chainInfo) => chainInfo.id)
  const gqlChains = enabledChainInfos.map((chainInfo) => chainInfo.backendChain.chain)

  const result = {
    chains,
    gqlChains,
    defaultChainId: getDefaultChainId({ platform, isTestnetModeEnabled }),
    isTestnetModeEnabled,
  }

  return result
}

function getDefaultChainId({
  platform,
  isTestnetModeEnabled,
}: {
  platform?: Platform
  isTestnetModeEnabled: boolean
}): UniverseChainId {
  if (platform === Platform.SVM) {
    // TODO(Solana): is there a Solana testnet we can return here?
    return UniverseChainId.Solana
  }

  return UniverseChainId.Kasane
}

/** Returns all stablecoins for a given chainId. */
export function getStablecoinsForChain(chainId: UniverseChainId): Token[] {
  return getChainInfo(chainId).tokens.stablecoins
}

/** Returns the primary stablecoin for a given chainId. */
export function getPrimaryStablecoin(chainId: UniverseChainId): Token {
  return getChainInfo(chainId).tokens.stablecoins[0]
}

export function isUniverseChainId(chainId?: number | UniverseChainId | null): chainId is UniverseChainId {
  return !!chainId && ALL_CHAIN_IDS.includes(chainId as UniverseChainId)
}
