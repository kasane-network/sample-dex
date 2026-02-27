import { BackendApi } from '@universe/api'
import { amount } from 'uniswap/src/test/fixtures/gql/amounts'
import { daiToken, ethToken } from 'uniswap/src/test/fixtures/gql/assets'
import { faker } from 'uniswap/src/test/shared'
import { createFixture, randomEnumValue } from 'uniswap/src/test/utils'

/**
 * Base fixtures
 */

export const tokenApproval = createFixture<BackendApi.TokenApproval>()(() => ({
  __typename: 'TokenApproval',
  id: faker.datatype.uuid(),
  approvedAddress: faker.finance.ethereumAddress(),
  quantity: faker.datatype.float({ min: 0, max: 1000, precision: 0.01 }).toString(),
  asset: ethToken(),
  tokenStandard: randomEnumValue(BackendApi.TokenStandard),
}))

export const tokenTransfer = createFixture<BackendApi.TokenTransfer>()(() => ({
  __typename: 'TokenTransfer',
  id: faker.datatype.uuid(),
  asset: ethToken(),
  direction: randomEnumValue(BackendApi.TransactionDirection),
  quantity: faker.datatype.float({ min: 0, max: 1000, precision: 0.01 }).toString(),
  recipient: faker.finance.ethereumAddress(),
  sender: faker.finance.ethereumAddress(),
  tokenStandard: randomEnumValue(BackendApi.TokenStandard),
}))

/**
 * Derived fixtures
 */

export const erc20ApproveAssetChange = createFixture<BackendApi.TokenApproval>()(() =>
  tokenApproval({ asset: daiToken(), tokenStandard: BackendApi.TokenStandard.Erc20 }),
)

export const erc20TokenTransferOut = createFixture<BackendApi.TokenTransfer>()(() =>
  tokenTransfer({
    asset: daiToken(),
    tokenStandard: BackendApi.TokenStandard.Erc20,
    direction: BackendApi.TransactionDirection.Out,
    transactedValue: amount({ value: 1, currency: BackendApi.Currency.Usd }),
  }),
)

export const erc20TransferIn = createFixture<BackendApi.TokenTransfer>()(() =>
  erc20TokenTransferOut({ direction: BackendApi.TransactionDirection.In }),
)
