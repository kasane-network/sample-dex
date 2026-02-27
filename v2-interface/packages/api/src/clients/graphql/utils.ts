// Temporary GraphQL utility shim.
export function isError(error: unknown): boolean {
  return Boolean(error)
}

export function isNonPollingRequestInFlight(): boolean {
  return false
}

export function isWarmLoadingStatus(): boolean {
  return false
}
