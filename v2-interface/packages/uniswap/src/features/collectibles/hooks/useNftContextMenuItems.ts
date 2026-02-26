import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MenuOptionItem } from 'uniswap/src/components/menus/ContextMenuV2'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getNFTAssetKey } from 'uniswap/src/features/collectibles/utils'
import { selectNftsVisibility } from 'uniswap/src/features/visibility/selectors'
import { setNftVisibility } from 'uniswap/src/features/visibility/slice'
import { getNftExplorerLink, openUri } from 'uniswap/src/utils/linking'

export function useNFTContextMenuItems({
  contractAddress,
  tokenId,
  owner: _owner,
  walletAddresses: _walletAddresses,
  isSpam,
  showNotification: _showNotification,
  chainId,
}: {
  contractAddress?: string
  tokenId?: string
  owner: Address
  walletAddresses: Address[]
  isSpam?: boolean
  showNotification?: boolean
  chainId?: UniverseChainId
}): MenuOptionItem[] {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const nftVisibility = useSelector(selectNftsVisibility)

  return useMemo(() => {
    if (!contractAddress || !tokenId) {
      return []
    }

    const nftKey = getNFTAssetKey(contractAddress, tokenId)
    const explicitVisibility = nftVisibility[nftKey]?.isVisible
    const isHidden = explicitVisibility !== undefined ? !explicitVisibility : Boolean(isSpam)

    return [
      {
        label: isHidden ? t('tokens.nfts.hidden.action.unhide') : t('tokens.nfts.hidden.action.hide'),
        onPress: () => dispatch(setNftVisibility({ nftKey, isVisible: isHidden })),
      },
      {
        label: t('common.viewOnExplorer'),
        onPress: () => {
          const url = getNftExplorerLink({
            chainId,
            fallbackChainId: UniverseChainId.Mainnet,
            contractAddress,
            tokenId,
          })
          void openUri({ uri: url })
        },
      },
    ]
  }, [chainId, contractAddress, dispatch, isSpam, nftVisibility, t, tokenId])
}
