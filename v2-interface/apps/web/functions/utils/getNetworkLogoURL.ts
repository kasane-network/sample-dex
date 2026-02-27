import { BackendApi } from '@universe/api'

export default function getNetworkLogoUrl(network: string, origin: string) {
  switch (network) {
    case BackendApi.Chain.Polygon:
      return origin + '/images/logos/Polygon_Logo.png'
    case BackendApi.Chain.Arbitrum:
      return origin + '/images/logos/Arbitrum_Logo.png'
    case BackendApi.Chain.Optimism:
      return origin + '/images/logos/Optimism_Logo.png'
    case BackendApi.Chain.Celo:
      return origin + '/images/logos/Celo_Logo.png'
    case BackendApi.Chain.Base:
      return origin + '/images/logos/Base_Logo.png'
    case BackendApi.Chain.Bnb:
      return origin + '/images/logos/BNB_Logo.png'
    case BackendApi.Chain.Avalanche:
      return origin + '/images/logos/Avax_Logo.png'
    case BackendApi.Chain.Blast:
      return origin + '/images/logos/Blast_Logo.png'
    case BackendApi.Chain.Zora:
      return origin + '/images/logos/Zora_Logo.png'
    case BackendApi.Chain.Zksync:
      return origin + '/images/logos/zkSync_Logo.png'
    case BackendApi.Chain.Unichain:
      return origin + '/images/logos/Unichain_Logo.png'
    default:
      return ''
  }
}
