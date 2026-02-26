import { NetworkStatus } from '@apollo/client'
import { BaseResult } from 'uniswap/src/features/dataApi/types'
import { UniswapXOrderDetails } from 'uniswap/src/features/transactions/types/transactionDetails'

/**
 * UniswapX order status retrieval is disabled.
 */
export function useOpenLimitOrders(_params: {
  evmAddress: string
  svmAddress?: string
}): BaseResult<UniswapXOrderDetails[]> {
  return {
    data: [],
    loading: false,
    networkStatus: NetworkStatus.ready,
    refetch: () => {},
  }
}
