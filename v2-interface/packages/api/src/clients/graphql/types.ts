// where: packages/api GraphQL shared hook result typing
// what: represent common query state shape used by web and shared packages
// why: preserve compatibility with existing consumers while keeping strict typing

export type GqlResult<T> = {
  data?: T
  loading: boolean
  error?: Error
  refetch?: (() => Promise<unknown>) | (() => void) | (() => null) | (() => undefined)
}
