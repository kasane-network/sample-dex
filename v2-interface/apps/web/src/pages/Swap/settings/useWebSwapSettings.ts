import { useMemo } from 'react'
import { useMultichainContext } from 'state/multichain/useMultichainContext'
import { chainIdToPlatform } from 'uniswap/src/features/platforms/utils/chains'
import { filterSettingsByPlatform } from 'uniswap/src/features/transactions/components/settings/utils'
import { Slippage } from 'uniswap/src/features/transactions/swap/components/SwapFormSettings/settingsConfigurations/slippage/Slippage/Slippage'

const DEFAULT_SETTINGS = [Slippage]

export function useWebSwapSettings() {
  const { chainId } = useMultichainContext()

  return useMemo(() => {
    return filterSettingsByPlatform(DEFAULT_SETTINGS, chainIdToPlatform(chainId))
  }, [chainId])
}
