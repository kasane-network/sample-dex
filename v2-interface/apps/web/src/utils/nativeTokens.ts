import { supportedChainIdFromGQLChain } from 'dataLayer/data/util'
import { BackendApi } from '@universe/api'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'

export function getNativeTokenDBAddress(chain: BackendApi.Chain): string | undefined {
  const pageChainId = supportedChainIdFromGQLChain(chain)
  if (pageChainId === undefined) {
    return undefined
  }

  return getChainInfo(pageChainId).backendChain.nativeTokenBackendAddress
}
