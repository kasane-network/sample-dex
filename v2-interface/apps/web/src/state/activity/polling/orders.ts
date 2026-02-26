import { type OnActivityUpdate } from 'state/activity/types'
import { UniswapXBackendOrder } from 'types/uniswapx'

export const QUICK_POLL_INITIAL_INTERVAL = 500
export const QUICK_POLL_MEDIUM_INTERVAL = 2000
export const QUICK_POLL_MAX_INTERVAL = 30000
export const QUICK_POLL_INITIAL_PHASE = 10000
export const QUICK_POLL_MEDIUM_PHASE = 200000

export function getQuickPollingInterval(_orderStartTime: number): number {
  return QUICK_POLL_MAX_INTERVAL
}

export async function fetchOpenLimitOrders(_params: {
  account?: string
  orderHashes?: string[]
}): Promise<UniswapXBackendOrder[]> {
  return []
}

export function usePollPendingOrders(_onActivityUpdate: OnActivityUpdate) {
  return null
}
