import { useContext } from 'react'
import { DEFAULT_CHAIN_ID } from 'constants/chains'
import { MultichainContext } from 'state/multichain/types'

export function useMultichainContext() {
  const context = useContext(MultichainContext)

  return {
    ...context,
    chainId: DEFAULT_CHAIN_ID,
    initialChainId: DEFAULT_CHAIN_ID,
    isMultichainContext: true,
  }
}
