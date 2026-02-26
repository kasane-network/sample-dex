import { GraphQLApi } from '@universe/api'
import { EMPTY_NFT_ITEM, HIDDEN_NFTS_ROW } from 'uniswap/src/features/collectibles/constants'
import { NFTItem } from 'uniswap/src/features/collectibles/types'
import { NFTKeyToVisibility } from 'uniswap/src/features/visibility/slice'

function toLower(value: string | undefined): string {
  return value?.toLowerCase() ?? ''
}

export function getNFTAssetKey(contractAddress: string, tokenId: string): string {
  return `${toLower(contractAddress)}:${tokenId}`
}

export function getIsNftHidden({
  contractAddress,
  tokenId,
  isSpam,
  nftVisibility,
}: {
  contractAddress?: string
  tokenId?: string
  isSpam?: boolean
  nftVisibility: NFTKeyToVisibility
}): boolean {
  if (!contractAddress || !tokenId) {
    return Boolean(isSpam)
  }

  const key = getNFTAssetKey(contractAddress, tokenId)
  const visibility = nftVisibility[key]

  if (visibility) {
    return !visibility.isVisible
  }

  return Boolean(isSpam)
}

export function filterNft(item: NFTItem, search: string): boolean {
  const normalized = search.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return (
    toLower(item.name).includes(normalized) ||
    toLower(item.collectionName).includes(normalized) ||
    toLower(item.contractAddress).includes(normalized) ||
    (item.tokenId ?? '').toLowerCase().includes(normalized)
  )
}

export function buildNftsArray({
  shownNfts,
  hiddenNfts,
  showHidden,
  allPagesFetched,
}: {
  shownNfts: NFTItem[]
  hiddenNfts: NFTItem[]
  showHidden: boolean
  allPagesFetched: boolean
}): Array<NFTItem | string> {
  const result: Array<NFTItem | string> = [...shownNfts]

  if (hiddenNfts.length > 0) {
    result.push(HIDDEN_NFTS_ROW)
    if (showHidden) {
      result.push(...hiddenNfts)
    }
  }

  if (result.length === 0 && allPagesFetched) {
    result.push(EMPTY_NFT_ITEM)
  }

  return result
}

export function formatNftItems(data: GraphQLApi.NftsTabQuery | undefined): NFTItem[] {
  const edges = data?.nftBalances?.edges
  if (!edges || edges.length === 0) {
    return []
  }

  return edges
    .map((edge) => edge.node.ownedAsset)
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    .map((asset) => {
      const floorPrice = asset.collection?.markets?.[0]?.floorPrice?.value
      const width = asset.image?.dimensions?.width
      const height = asset.image?.dimensions?.height

      return {
        id: asset.id,
        chain: asset.chain,
        contractAddress: asset.nftContract?.address,
        tokenId: asset.tokenId,
        name: asset.name,
        description: asset.description,
        collectionName: asset.collection?.name,
        collectionIsVerified: asset.collection?.isVerified,
        floorPrice: floorPrice !== undefined ? Number(floorPrice) : undefined,
        imageUrl: asset.image?.url,
        thumbnailUrl: asset.thumbnail?.url,
        imageDimensions:
          typeof width === 'number' && typeof height === 'number'
            ? {
                width,
                height,
              }
            : undefined,
        isSpam: asset.isSpam,
      } satisfies NFTItem
    })
}
