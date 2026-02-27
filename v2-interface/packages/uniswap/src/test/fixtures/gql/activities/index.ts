import { BackendApi } from '@universe/api'
import { STALE_TRANSACTION_TIME_MS } from 'uniswap/src/features/notifications/constants'
import {
  erc20ApproveAssetChange,
  erc20TokenTransferOut,
  erc20TransferIn,
} from 'uniswap/src/test/fixtures/gql/activities/tokens'
import { GQL_CHAINS } from 'uniswap/src/test/fixtures/gql/misc'
import { gqlTransaction, gqlTransactionDetails } from 'uniswap/src/test/fixtures/gql/transactions'
import { faker, MAX_FIXTURE_TIMESTAMP } from 'uniswap/src/test/shared'
import { createFixture, randomChoice, randomEnumValue } from 'uniswap/src/test/utils'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'

export * from './nfts'
export * from './swap'
export * from './tokens'

/**
 * Base fixtures
 */

export const assetActivity = createFixture<BackendApi.AssetActivity>()(() => ({
  id: faker.datatype.uuid(),
  chain: randomChoice(GQL_CHAINS),
  /** @deprecated use assetChanges field in details */
  assetChanges: [] as BackendApi.AssetChange[],
  details: gqlTransactionDetails(),
  timestamp: faker.datatype.number({ max: MAX_FIXTURE_TIMESTAMP }),
  /** @deprecated use type field in details */
  transaction: gqlTransaction(),
  /** @deprecated use type field in details */
  type: randomEnumValue(BackendApi.ActivityType),
}))

/**
 * Derived fixtures
 */

export const approveAssetActivity = createFixture<BackendApi.AssetActivity>()(() =>
  assetActivity({
    chain: BackendApi.Chain.MonadTestnet,
    /** @deprecated use type field in details */
    type: BackendApi.ActivityType.Approve,
    details: gqlTransactionDetails({
      type: BackendApi.TransactionType.Approve,
      transactionStatus: BackendApi.TransactionStatus.Confirmed,
      assetChanges: [erc20ApproveAssetChange()],
    }),
  }),
)

export const erc20SwapAssetActivity = createFixture<BackendApi.AssetActivity>()(() =>
  assetActivity({
    chain: BackendApi.Chain.MonadTestnet,
    /** @deprecated use type field in details */
    type: BackendApi.ActivityType.Swap,
    details: gqlTransactionDetails({
      type: BackendApi.TransactionType.Swap,
      transactionStatus: BackendApi.TransactionStatus.Confirmed,
      assetChanges: [erc20TransferIn(), erc20TokenTransferOut()],
    }),
  }),
)

export const erc20RecentReceiveAssetActivity = createFixture<BackendApi.AssetActivity>()(() =>
  assetActivity({
    chain: BackendApi.Chain.MonadTestnet,
    /** @deprecated use type field in details */
    type: BackendApi.ActivityType.Receive,
    timestamp: (Date.now() - ONE_MINUTE_MS * 5) / 1000,
    details: gqlTransactionDetails({
      type: BackendApi.TransactionType.Receive,
      transactionStatus: BackendApi.TransactionStatus.Confirmed,
      assetChanges: [erc20TransferIn()],
    }),
  }),
)

export const erc20StaleReceiveAssetActivity = createFixture<BackendApi.AssetActivity>()(() =>
  assetActivity({
    chain: BackendApi.Chain.MonadTestnet,
    /** @deprecated use type field in details */
    type: BackendApi.ActivityType.Receive,
    timestamp: (Date.now() - STALE_TRANSACTION_TIME_MS * 2) / 1000,
    details: gqlTransactionDetails({
      type: BackendApi.TransactionType.Receive,
      transactionStatus: BackendApi.TransactionStatus.Confirmed,
      assetChanges: [erc20TransferIn()],
    }),
  }),
)
