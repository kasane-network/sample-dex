import { PortfolioBalance } from 'uniswap/src/features/dataApi/types'

export function portfolioBalancesById(inputBalances?: PortfolioBalance[]): Record<string, PortfolioBalance> {
  const balances = inputBalances ?? []

  return balances.reduce(
    (acc, balance) => {
      acc[balance.currencyInfo.currencyId] = balance
      return acc
    },
    {} as Record<string, PortfolioBalance>,
  )
}
