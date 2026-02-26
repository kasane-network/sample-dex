import { GraphQLApi } from '@universe/api'
import { WatchQueryFetchPolicy } from '@apollo/client'
import { GetThemeValueForKey } from 'ui/src'

/**
 * Shared props type for search input components
 */
export interface SearchInputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  width?: GetThemeValueForKey<'width'>
}

export type NftsNextFetchPolicy = WatchQueryFetchPolicy

export type GQLNftAsset = NonNullable<
  NonNullable<NonNullable<GraphQLApi.NftBalanceQuery['nftBalances']>['edges'][number]>['node']['ownedAsset']
>

export interface NFTItem {
  id: string
  chain?: GraphQLApi.Chain
  contractAddress?: string
  tokenId?: string
  name?: string
  description?: string
  collectionName?: string
  collectionIsVerified?: boolean
  floorPrice?: number
  imageUrl?: string
  thumbnailUrl?: string
  animationUrl?: string
  imageDimensions?: {
    width: number
    height: number
  }
  isSpam?: boolean
}
