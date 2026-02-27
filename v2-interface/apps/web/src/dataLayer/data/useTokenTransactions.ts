import { BackendApi } from '@universe/api'
import i18n from 'uniswap/src/i18n'

export enum TokenTransactionType {
  BUY = 'Buy',
  SELL = 'Sell',
}

export const getTokenTransactionTypeTranslation = (type: TokenTransactionType): string => {
  switch (type) {
    case TokenTransactionType.BUY:
      return i18n.t('common.buy.label')
    case TokenTransactionType.SELL:
      return i18n.t('common.sell.label')
    default:
      return ''
  }
}

export function useTokenTransactions(_params: {
  address: string
  chainId: number
  filter?: TokenTransactionType[]
}) {
  return {
    transactions: [] as BackendApi.PoolTransaction[],
    loading: false,
    loadMore: (_args: { onComplete?: () => void }) => _args.onComplete?.(),
    errorV2: undefined,
    errorV3: undefined,
    errorV4: undefined,
  }
}
