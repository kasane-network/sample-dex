import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

export function useResetUnitagsQueries(): () => void {
  const queryClient = useQueryClient()

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [ReactQueryCacheKey.UnitagsApi] })
  }, [queryClient])
}
