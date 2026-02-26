import { useUpdateAtom } from 'jotai/utils'
import { DEFAULT_CHAIN_ID } from 'constants/chains'
import { multicallUpdaterSwapChainIdAtom } from 'lib/hooks/useBlockNumber'
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { MultichainContext } from 'state/multichain/types'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

export function MultichainContextProvider({
  children,
  initialChainId: _initialChainId,
}: PropsWithChildren<{
  initialChainId?: UniverseChainId
}>) {
  const [isUserSelectedToken, setIsUserSelectedToken] = useState<boolean>(false)

  const setMulticallUpdaterChainId = useUpdateAtom(multicallUpdaterSwapChainIdAtom)
  useEffect(() => {
    setMulticallUpdaterChainId(DEFAULT_CHAIN_ID)
  }, [setMulticallUpdaterChainId])

  const setSelectedChainId = useCallback(() => {
    return
  }, [])

  const reset = useCallback(() => {
    setIsUserSelectedToken(false)
  }, [])

  const value = useMemo(() => {
    return {
      reset,
      setSelectedChainId,
      initialChainId: DEFAULT_CHAIN_ID,
      chainId: DEFAULT_CHAIN_ID,
      isMultichainContext: true,
      isUserSelectedToken,
      setIsUserSelectedToken,
    }
  }, [isUserSelectedToken, reset, setSelectedChainId])
  return <MultichainContext.Provider value={value}>{children}</MultichainContext.Provider>
}
