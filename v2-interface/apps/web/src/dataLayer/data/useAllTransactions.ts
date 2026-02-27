import { BackendApi } from '@universe/api'
import i18n from 'uniswap/src/i18n'

export enum TransactionType {
  SWAP = 'Swap',
  ADD = 'Add',
  REMOVE = 'Remove',
}

export const getTransactionTypeTranslation = (type: TransactionType): string => {
  switch (type) {
    case TransactionType.SWAP:
      return i18n.t('common.swap')
    case TransactionType.ADD:
      return i18n.t('common.add.label')
    case TransactionType.REMOVE:
      return i18n.t('common.remove.label')
    default:
      return ''
  }
}

export const BETypeToTransactionType: { [key: string]: TransactionType } = {
  [BackendApi.PoolTransactionType.Swap]: TransactionType.SWAP,
  [BackendApi.PoolTransactionType.Remove]: TransactionType.REMOVE,
  [BackendApi.PoolTransactionType.Add]: TransactionType.ADD,
}

export function useAllTransactions(_chain: BackendApi.Chain, _filter: TransactionType[] = [TransactionType.SWAP]) {
  return {
    transactions: [] as BackendApi.PoolTxFragment[],
    loading: false,
    errorV2: undefined,
    errorV3: undefined,
    errorV4: undefined,
    loadMore: (_args: { onComplete?: () => void }) => _args.onComplete?.(),
  }
}
