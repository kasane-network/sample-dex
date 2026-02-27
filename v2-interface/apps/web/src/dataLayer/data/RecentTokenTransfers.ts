import { BackendApi } from '@universe/api'

export function useRecentTokenTransfers(_address?: string): { data: BackendApi.TokenTransfer[] | undefined; loading: boolean } {
  return {
    data: undefined,
    loading: false,
  }
}
