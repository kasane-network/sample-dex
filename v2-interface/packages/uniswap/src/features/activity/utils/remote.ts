import { SpamCode as RestSpamCode, TokenType } from '@uniswap/client-data-api/dist/data/v1/types_pb'
import { Token as SdkToken } from '@uniswap/sdk-core'
import { BackendApi } from '@universe/api'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { AssetType } from 'uniswap/src/entities/assets'
import { fromGraphQLChain } from 'uniswap/src/features/chains/utils'
import { getCurrencyAmount, ValueType } from 'uniswap/src/features/tokens/getCurrencyAmount'
import { TransactionStatus } from 'uniswap/src/features/transactions/types/transactionDetails'

/**
 * Maps token type to asset type for the transaction
 */
export function mapTokenTypeToAssetType(tokenType?: TokenType): AssetType {
  switch (tokenType) {
    case TokenType.ERC721:
      return AssetType.ERC721
    case TokenType.ERC1155:
      return AssetType.ERC1155
    case TokenType.NATIVE:
    case TokenType.ERC20:
    default:
      return AssetType.Currency
  }
}

export enum AssetCase {
  Nft = 'nft',
  Token = 'token',
}

/**
 * Parses an asset from API and returns either the token address or native currency address
 * for the involved asset.
 * @returns Token address, custom native address or null
 */
export function getAddressFromAsset({
  tokenStandard,
  chain,
  address,
}: {
  tokenStandard: BackendApi.TokenStandard
  chain: BackendApi.Chain | undefined
  address: Maybe<string>
}): Maybe<string> {
  const supportedChainId = fromGraphQLChain(chain)
  if (!supportedChainId) {
    return null
  }
  if (tokenStandard === BackendApi.TokenStandard.Native) {
    return getNativeAddress(supportedChainId)
  }
  return address
}

/**
 * Determines if a token is spam based on REST API spam codes
 */
export function isRestTokenSpam(spamCode?: RestSpamCode): boolean {
  return spamCode === RestSpamCode.SPAM || spamCode === RestSpamCode.SPAM_URL
}

/**
 *
 * @param transactedValue Transacted value amount from TokenTransfer API response
 * @returns parsed USD value as a number if currency is of type USD
 */
export function parseUSDValueFromAssetChange(transactedValue: Maybe<Partial<BackendApi.Amount>>): number | undefined {
  return transactedValue?.currency === BackendApi.Currency.Usd ? (transactedValue.value ?? undefined) : undefined
}

/**
 * Constructs a CurrencyAmount based on asset details and quantity. Checks if token is native
 * or ERC20 to determine decimal amount.
 * @param tokenStandard token standard type from api query
 * @param quantity // formatted amount of asset transferred
 * @param decimals // decimals ((optional) if native token)
 * @returns
 */
export function deriveCurrencyAmountFromAssetResponse({
  tokenStandard,
  chain,
  address,
  decimals,
  quantity,
}: {
  tokenStandard: BackendApi.TokenStandard
  chain: BackendApi.Chain
  address: Maybe<string>
  decimals: Maybe<number>
  quantity: string
}): string {
  const chainId = fromGraphQLChain(chain)
  if (!chainId) {
    return ''
  }

  const currency =
    tokenStandard === BackendApi.TokenStandard.Native
      ? nativeOnChain(chainId)
      : address && decimals
        ? new SdkToken(chainId, address, decimals)
        : undefined

  const currencyAmount = getCurrencyAmount({
    value: quantity,
    valueType: ValueType.Exact,
    currency,
  })

  return currencyAmount?.quotient.toString() ?? ''
}

// eslint-disable-next-line consistent-return
export function remoteTxStatusToLocalTxStatus(
  type: BackendApi.TransactionType,
  status: BackendApi.TransactionStatus,
): TransactionStatus {
  switch (status) {
    case BackendApi.TransactionStatus.Failed:
      if (type === BackendApi.TransactionType.Cancel) {
        return TransactionStatus.FailedCancel
      }
      return TransactionStatus.Failed
    case BackendApi.TransactionStatus.Pending:
      if (type === BackendApi.TransactionType.Cancel) {
        return TransactionStatus.Cancelling
      }
      return TransactionStatus.Pending
    case BackendApi.TransactionStatus.Confirmed:
      if (type === BackendApi.TransactionType.Cancel) {
        return TransactionStatus.Canceled
      }
      return TransactionStatus.Success
  }
}
