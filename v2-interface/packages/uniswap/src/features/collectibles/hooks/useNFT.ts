import { ApolloError } from '@apollo/client'
import { GQLNftAsset } from 'uniswap/src/features/collectibles/types'

export function useNFT({
  owner,
  address,
  tokenId,
  skip,
}: {
  owner?: Address
  address?: Address
  tokenId?: string
  skip?: boolean
}): {
  data?: GQLNftAsset
  loading: boolean
  error?: ApolloError
  refetch: () => void
} {
  void owner
  void address
  void tokenId
  void skip
  return {
    data: undefined,
    loading: false,
    error: undefined,
    refetch: () => undefined,
  }
}
