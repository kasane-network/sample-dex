import { BackendApi } from '@universe/api'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

export type ChainOutageData = {
  chainId: UniverseChainId
  version?: BackendApi.ProtocolVersion
}
