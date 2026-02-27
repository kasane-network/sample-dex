import type { PropsWithChildren } from 'react'

export function PrefetchBalancesWrapper({ children }: PropsWithChildren): JSX.Element {
  return <>{children}</>
}

export function useTotalBalancesUsdForAnalytics(): number | undefined {
  return undefined
}

export function useReportTotalBalancesUsdForAnalytics(): void {}
