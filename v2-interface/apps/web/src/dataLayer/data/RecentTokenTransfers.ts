import { GraphQLApi } from '@universe/api'

export function useRecentTokenTransfers(_address?: string): { data: GraphQLApi.TokenTransfer[] | undefined; loading: boolean } {
  return {
    data: undefined,
    loading: false,
  }
}
