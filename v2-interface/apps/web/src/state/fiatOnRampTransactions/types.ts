import { BackendApi } from '@universe/api'

export enum FiatOnRampTransactionStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

// eslint-disable-next-line consistent-return
export function backendStatusToFiatOnRampStatus(status: BackendApi.TransactionStatus) {
  switch (status) {
    case BackendApi.TransactionStatus.Confirmed:
      return FiatOnRampTransactionStatus.COMPLETE
    case BackendApi.TransactionStatus.Pending:
      return FiatOnRampTransactionStatus.PENDING
    case BackendApi.TransactionStatus.Failed:
      return FiatOnRampTransactionStatus.FAILED
  }
}

export enum FiatOnRampTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER = 'TRANSFER',
}
