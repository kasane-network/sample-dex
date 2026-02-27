import { BackendApi } from '@universe/api'
import { faker } from 'uniswap/src/test/shared'
import { createFixture, randomEnumValue } from 'uniswap/src/test/utils'

export const gqlTransaction = createFixture<BackendApi.Transaction>()(() => ({
  __typename: 'Transaction',
  id: faker.datatype.uuid(),
  hash: faker.datatype.uuid(),
  blockNumber: faker.datatype.number(),
  from: faker.finance.ethereumAddress(),
  to: faker.finance.ethereumAddress(),
  nonce: faker.datatype.number(),
  status: randomEnumValue(BackendApi.TransactionStatus),
}))

type TransactionDetailsBaseOptions = {
  transactionStatus: BackendApi.TransactionStatus
}

export const gqlTransactionDetails = createFixture<BackendApi.TransactionDetails, TransactionDetailsBaseOptions>({
  transactionStatus: randomEnumValue(BackendApi.TransactionStatus),
})(({ transactionStatus }) => ({
  __typename: 'TransactionDetails',
  id: faker.datatype.uuid(),
  hash: faker.datatype.uuid(),
  from: faker.finance.ethereumAddress(),
  to: faker.finance.ethereumAddress(),
  nonce: faker.datatype.number(),
  /** @deprecated use transactionStatus to disambiguate from swapOrderStatus */
  status: transactionStatus,
  transactionStatus,
  type: randomEnumValue(BackendApi.TransactionType),
  assetChanges: [] as BackendApi.AssetChange[],
}))
