import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { NFTItem } from 'uniswap/src/features/collectibles/types'
import { buildNftsArray, getIsNftHidden } from 'uniswap/src/features/collectibles/utils'
import { selectNftsVisibility } from 'uniswap/src/features/visibility/selectors'

export function useGroupNftsByVisibility({
  nftDataItems,
  showHidden,
  allPagesFetched,
}: {
  nftDataItems: NFTItem[]
  showHidden: boolean
  allPagesFetched: boolean
}): {
  nfts: Array<NFTItem | string>
  shownNfts: NFTItem[]
  hiddenNfts: NFTItem[]
  numShown: number
  numHidden: number
} {
  const nftVisibility = useSelector(selectNftsVisibility)

  return useMemo(() => {
    const shownNfts: NFTItem[] = []
    const hiddenNfts: NFTItem[] = []

    for (const item of nftDataItems) {
      const hidden = getIsNftHidden({
        contractAddress: item.contractAddress,
        tokenId: item.tokenId,
        isSpam: item.isSpam,
        nftVisibility,
      })

      if (hidden) {
        hiddenNfts.push(item)
      } else {
        shownNfts.push(item)
      }
    }

    return {
      nfts: buildNftsArray({ shownNfts, hiddenNfts, showHidden, allPagesFetched }),
      shownNfts,
      hiddenNfts,
      numShown: shownNfts.length,
      numHidden: hiddenNfts.length,
    }
  }, [allPagesFetched, nftDataItems, nftVisibility, showHidden])
}
