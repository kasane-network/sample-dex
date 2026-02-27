// where: packages/api GraphQL public surface
// what: re-export generated schema/operations types for BackendApi namespace
// why: keep BackendApi type/value compatibility across web and shared packages

export * from '@universe/api/src/clients/graphql/__generated__/schema-types'
export * from '@universe/api/src/clients/graphql/__generated__/operations'
export * from '@universe/api/src/clients/graphql/__generated__/resolvers'
export * from '@universe/api/src/clients/graphql/__generated__/react-hooks'

// Historical alias used in consumers.
export type PortfolioBalancesQueryResult =
  import('@universe/api/src/clients/graphql/__generated__/react-hooks').PortfolioBalancesQueryResult
