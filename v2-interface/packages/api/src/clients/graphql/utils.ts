// where: packages/api GraphQL status helpers
// what: utility predicates for Apollo-like network status values
// why: keep shared loading/error behavior consistent across consumers

const NETWORK_STATUS = {
  loading: 1,
  setVariables: 2,
  fetchMore: 3,
  refetch: 4,
  poll: 6,
  ready: 7,
  error: 8,
} as const

export function isError(networkStatus: number | undefined, hasCachedData = false): boolean {
  return networkStatus === NETWORK_STATUS.error && !hasCachedData
}

export function isNonPollingRequestInFlight(networkStatus: number | undefined): boolean {
  if (networkStatus === undefined) {
    return false
  }

  return networkStatus < NETWORK_STATUS.ready && networkStatus !== NETWORK_STATUS.poll
}

export function isWarmLoadingStatus(networkStatus: number | undefined): boolean {
  return (
    networkStatus === NETWORK_STATUS.refetch ||
    networkStatus === NETWORK_STATUS.fetchMore ||
    networkStatus === NETWORK_STATUS.setVariables ||
    networkStatus === NETWORK_STATUS.poll
  )
}
