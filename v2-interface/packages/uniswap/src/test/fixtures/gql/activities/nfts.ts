import { BackendApi } from '@universe/api'
import { nftAsset } from 'uniswap/src/test/fixtures/gql/assets'
import { faker } from 'uniswap/src/test/shared'
import { createFixture, randomEnumValue } from 'uniswap/src/test/utils'

export const nftApproval = createFixture<BackendApi.NftApproval>()(() => ({
  __typename: 'NftApproval',
  id: faker.datatype.uuid(),
  approvedAddress: faker.finance.ethereumAddress(),
  nftStandard: randomEnumValue(BackendApi.NftStandard),
  asset: nftAsset(),
}))

export const nftApproveForAll = createFixture<BackendApi.NftApproveForAll>()(() => ({
  __typename: 'NftApproveForAll',
  id: faker.datatype.uuid(),
  approved: faker.datatype.boolean(),
  nftStandard: randomEnumValue(BackendApi.NftStandard),
  operatorAddress: faker.finance.ethereumAddress(),
  asset: nftAsset(),
}))

export const nftTransfer = createFixture<BackendApi.NftTransfer>()(() => ({
  __typename: 'NftTransfer',
  id: faker.datatype.uuid(),
  sender: faker.finance.ethereumAddress(),
  recipient: faker.finance.ethereumAddress(),
  direction: randomEnumValue(BackendApi.TransactionDirection),
  nftStandard: randomEnumValue(BackendApi.NftStandard),
  asset: nftAsset(),
}))
