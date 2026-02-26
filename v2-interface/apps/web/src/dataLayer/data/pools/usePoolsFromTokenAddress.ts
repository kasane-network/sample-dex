import { PoolTableSortState, TablePool } from 'dataLayer/data/pools/useTopPools'
import { ApolloError } from '@apollo/client'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

type PoolsFromTokenAddressResult = {
  loading: boolean
  errorV2: ApolloError | undefined
  errorV3: ApolloError | undefined
  errorV4: ApolloError | undefined
  pools: TablePool[]
  loadMore: (args: { onComplete?: () => void }) => void
}

export function usePoolsFromTokenAddress(_params: {
  tokenAddress: string
  sortState: PoolTableSortState
  chainId: UniverseChainId
  isNative?: boolean
}): PoolsFromTokenAddressResult {
  return {
    loading: false,
    errorV2: undefined,
    errorV3: undefined,
    errorV4: undefined,
    pools: [] as TablePool[],
    loadMore: (_args: { onComplete?: () => void }) => _args.onComplete?.(),
  }
}
