import { NetworkStatus } from '@apollo/client'
import { useState } from 'react'
import { PollingInterval } from 'uniswap/src/constants/misc'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { type NFTItem } from 'uniswap/src/features/collectibles/types'
import type { NftsNextFetchPolicy } from 'uniswap/src/features/collectibles/types'

export function useNftListRenderData({
  owner,
  skip,
  chainsFilter,
  nextFetchPolicy,
  pollInterval,
}: {
  owner: Address
  skip?: boolean
  chainsFilter?: UniverseChainId[]
  nextFetchPolicy?: NftsNextFetchPolicy
  pollInterval?: PollingInterval
}): {
  nfts: (NFTItem | string)[]
  numHidden: number
  numShown: number
  hiddenNfts: NFTItem[]
  shownNfts: NFTItem[]
  isErrorState: boolean
  hasNextPage: boolean
  shouldAddInLoadingItem: boolean
  hiddenNftsExpanded: boolean
  setHiddenNftsExpanded: (value: boolean) => void
  networkStatus: NetworkStatus
  onListEndReached: () => Promise<void>
  refetch: () => void
} {
  void owner
  void skip
  void chainsFilter
  void nextFetchPolicy
  void pollInterval
  const [hiddenNftsExpanded, setHiddenNftsExpanded] = useState(false)

  return {
    nfts: [],
    numHidden: 0,
    numShown: 0,
    hiddenNfts: [],
    shownNfts: [],
    refetch: () => undefined,
    networkStatus: NetworkStatus.ready,
    onListEndReached: async () => undefined,
    hiddenNftsExpanded,
    setHiddenNftsExpanded,
    isErrorState: false,
    hasNextPage: false,
    shouldAddInLoadingItem: false,
  }
}
