// Temporary GraphQL result shim.
export type GqlResult<T> = {
  data?: T
  loading: boolean
  error?: Error
}
