import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

/**
 * Rewrites ETH/WETH tokens in wrap-related copy to the chain's native/wrapped symbols.
 * This keeps shared translation keys while rendering chain-correct wording (e.g. ICP/WICP on Kasane).
 */
export function formatWrapMessageByChain(message: string, chainId?: UniverseChainId): string {
  if (!chainId) {
    return message
  }

  try {
    const chainInfo = getChainInfo(chainId)
    const wrappedSymbol = chainInfo.wrappedNativeCurrency.symbol
    const nativeSymbol = chainInfo.nativeCurrency.symbol

    return message.replace(/WETH/g, wrappedSymbol).replace(/ETH/g, nativeSymbol)
  } catch {
    return message
  }
}
