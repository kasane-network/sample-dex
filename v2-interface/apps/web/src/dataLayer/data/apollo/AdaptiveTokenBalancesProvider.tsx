import type { PropsWithChildren } from 'react'
import { Flex } from 'ui/src'

export function useTokenBalancesQuery(_options?: { cacheOnly?: boolean }): { data: undefined } {
  return { data: undefined }
}

export function PrefetchBalancesWrapper({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <Flex className={className}>{children}</Flex>
}

export function AdaptiveTokenBalancesProvider({ children }: PropsWithChildren): JSX.Element {
  return <>{children}</>
}
