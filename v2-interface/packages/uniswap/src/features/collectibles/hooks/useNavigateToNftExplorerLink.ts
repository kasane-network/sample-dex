import { useCallback } from 'react'
import { NavigateToNftItemArgs } from 'uniswap/src/contexts/UniswapContext'
import { getNftExplorerLink, openUri } from 'uniswap/src/utils/linking'

export function useNavigateToNftExplorerLink(): (args: NavigateToNftItemArgs) => void {
  return useCallback((args: NavigateToNftItemArgs) => {
    const url = getNftExplorerLink({
      chainId: args.chainId,
      fallbackChainId: args.fallbackChainId,
      contractAddress: args.contractAddress,
      tokenId: args.tokenId,
    })

    void openUri({ uri: url })
  }, [])
}
