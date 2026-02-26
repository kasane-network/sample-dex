import { GQLNftAsset } from 'uniswap/src/features/collectibles/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getNftTokenAddress(nft: GQLNftAsset | undefined): string | undefined {
  if (!isRecord(nft)) {
    return undefined
  }

  if ('contractAddress' in nft) {
    const contractAddress = nft.contractAddress
    if (typeof contractAddress === 'string' && contractAddress.length > 0) {
      return contractAddress
    }
  }

  if ('nftContract' in nft) {
    const nftContract = nft.nftContract
    if (!isRecord(nftContract)) {
      return undefined
    }

    if ('address' in nftContract) {
      const nestedAddress = nftContract.address
      if (typeof nestedAddress === 'string' && nestedAddress.length > 0) {
        return nestedAddress
      }
    }
  }

  return undefined
}
