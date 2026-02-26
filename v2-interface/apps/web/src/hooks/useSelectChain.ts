import { popupRegistry } from 'components/Popups/registry'
import { PopupType } from 'components/Popups/types'
import { useAccount } from 'hooks/useAccount'
import { useIsSupportedChainIdCallback } from 'uniswap/src/features/chains/hooks/useSupportedChainId'
import { EVMUniverseChainId, UniverseChainId } from 'uniswap/src/features/chains/types'
import { isSVMChain } from 'uniswap/src/features/platforms/utils/chains'
import { logger } from 'utilities/src/logger/logger'
import { useEvent } from 'utilities/src/react/hooks'
import { UserRejectedRequestError } from 'viem'
import { useSwitchChain as useSwitchChainWagmi } from 'wagmi'

export default function useSelectChain() {
  const isSupportedChainCallback = useIsSupportedChainIdCallback()
  const { switchChain, chains: wagmiChains } = useSwitchChainWagmi()
  const account = useAccount()

  return useEvent(async (targetChain: UniverseChainId) => {
    if (isSVMChain(targetChain)) {
      // Solana connections are single-chain & maintained separately from EVM connections
      return true
    }

    try {
      // Inline the useSwitchChain logic here
      const isSupportedByEnabledChains = isSupportedChainCallback(targetChain as EVMUniverseChainId)
      const isSupportedByWagmiConfig = wagmiChains.some((chain) => chain.id === targetChain)

      if (!isSupportedByEnabledChains && !isSupportedByWagmiConfig) {
        logger.warn(
          'useSelectChain',
          'useSelectChain',
          'unsupported chain in enabled-chains and wagmi config checks',
          {
            targetChain,
            connectorName: account.connector?.name,
            wagmiChainIds: wagmiChains.map((chain) => chain.id),
          },
        )
        return false
      }
      const currentChainId = account.chainId
      if (currentChainId === targetChain) {
        // some wallets (e.g. SafeWallet) only support single-chain & will throw error on `switchChain` even if already on the correct chain
        return true
      }

      await new Promise<void>((resolve, reject) => {
        switchChain(
          { chainId: targetChain as EVMUniverseChainId },
          {
            onSettled(_: unknown, error: unknown) {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            },
          },
        )
      })

      return true
    } catch (error) {
      logger.warn('useSelectChain', 'useSelectChain', 'switch failed', {
        targetChain,
        message: error?.message,
        code: error?.code,
      })
      if (
        !error?.message?.includes("Request of type 'wallet_switchEthereumChain' already pending") &&
        !(error instanceof UserRejectedRequestError) /* request already pending */
      ) {
        logger.warn('useSelectChain', 'useSelectChain', error.message)

        popupRegistry.addPopup(
          { failedSwitchNetwork: targetChain, type: PopupType.FailedSwitchNetwork },
          'failed-network-switch',
        )
      }
      // TODO(WEB-3306): This UX could be improved to show an error state.
      return false
    }
  })
}
