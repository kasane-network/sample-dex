import { BigNumber, providers } from 'ethers'
import { SignerMnemonicAccountMeta } from 'uniswap/src/features/accounts/types'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { Platform } from 'uniswap/src/features/platforms/types/Platform'
import { signTypedData as signTypedDataFunction } from 'uniswap/src/features/transactions/signing'
import { getValidAddress } from 'uniswap/src/utils/addresses'
import { HexString } from 'utilities/src/addresses/hex'
import { PublicClient } from 'viem'
import { DelegationCheckResult } from 'wallet/src/features/smartWallet/delegation/types'
import {
  convertToEIP7702,
  createSignedAuthorization,
  signAndSerializeEIP7702Transaction,
} from 'wallet/src/features/transactions/executeTransaction/eip7702Utils'
import type { Provider } from 'wallet/src/features/transactions/executeTransaction/services/providerService'
import type { TransactionSigner } from 'wallet/src/features/transactions/executeTransaction/services/TransactionSignerService/transactionSignerService'
import { cleanTransactionGasFields } from 'wallet/src/features/transactions/utils/cleanTransactionGasFields'
import { EthereumTransactionType } from 'wallet/src/features/transactions/utils/cleanTransactionGasFields'
import { NativeSigner } from 'wallet/src/features/wallet/signing/NativeSigner'
import type { SignerManager } from 'wallet/src/features/wallet/signing/SignerManager'

const KASANE_FALLBACK_MAX_FEE_PER_GAS_WEI = '250000000000' // 250 gwei
const KASANE_FALLBACK_PRIORITY_FEE_PER_GAS_WEI = '250000000000' // 250 gwei

function isKasaneChainId(chainId: unknown): boolean {
  if (typeof chainId === 'number') {
    return chainId === UniverseChainId.Kasane
  }

  if (typeof chainId === 'string') {
    const parsed = Number(chainId)
    return Number.isFinite(parsed) && parsed === UniverseChainId.Kasane
  }

  return false
}

async function ensureKasaneEip1559GasFields(params: {
  request: providers.TransactionRequest
  provider: Provider
}): Promise<providers.TransactionRequest> {
  const { request, provider } = params

  if (!isKasaneChainId(request.chainId)) {
    return request
  }

  if (request.maxFeePerGas !== undefined && request.maxPriorityFeePerGas !== undefined) {
    return request
  }

  const fallbackMaxFeePerGas = BigNumber.from(KASANE_FALLBACK_MAX_FEE_PER_GAS_WEI)
  const fallbackPriorityFeePerGas = BigNumber.from(KASANE_FALLBACK_PRIORITY_FEE_PER_GAS_WEI)

  const feeSeed =
    request.maxFeePerGas ??
    request.maxPriorityFeePerGas ??
    request.gasPrice ??
    (await provider.getGasPrice().catch(() => fallbackMaxFeePerGas))

  const maxFeePerGas = request.maxFeePerGas ?? feeSeed ?? fallbackMaxFeePerGas
  const maxPriorityFeePerGas = request.maxPriorityFeePerGas ?? feeSeed ?? fallbackPriorityFeePerGas

  const { gasPrice: _gasPrice, ...requestWithoutGasPrice } = request

  return {
    ...requestWithoutGasPrice,
    type: EthereumTransactionType.EIP1559,
    maxFeePerGas,
    maxPriorityFeePerGas,
  }
}

export function createTransactionSignerService(ctx: {
  getAccount: () => SignerMnemonicAccountMeta
  getProvider: () => Promise<Provider>
  getSignerManager: () => SignerManager
}): TransactionSigner {
  // private method
  const getSigner = async (): Promise<NativeSigner> => {
    const signerManager = ctx.getSignerManager()
    const signer = await signerManager.getSignerForAccount(ctx.getAccount())
    return signer.connect(await ctx.getProvider())
  }

  // public methods
  const prepareTransaction: TransactionSigner['prepareTransaction'] = async (input) => {
    const provider = await ctx.getProvider()
    const signer = await getSigner()
    const kasaneSafeRequest = await ensureKasaneEip1559GasFields({ request: input.request, provider })
    // Clean up malformed transactions from dapps before populating
    const cleanedRequest = cleanTransactionGasFields(kasaneSafeRequest)
    const populatedRequest = await signer.populateTransaction(cleanedRequest)
    return populatedRequest
  }

  const signTransaction: TransactionSigner['signTransaction'] = async (input) => {
    const signer = await getSigner()
    const signedTx = await signer.signTransaction(input)
    return signedTx
  }

  const signTypedData: TransactionSigner['signTypedData'] = async (input) => {
    const signer = await getSigner()
    const signedData = await signTypedDataFunction({
      domain: input.domain,
      types: input.types,
      value: input.value,
      signer,
    })
    return signedData
  }

  const sendTransaction: TransactionSigner['sendTransaction'] = async (input) => {
    const provider = await ctx.getProvider()
    const transactionResponse = await provider.sendTransaction(input.signedTx)
    return transactionResponse.hash
  }

  const sendTransactionSync: TransactionSigner['sendTransactionSync'] = async (input) => {
    const jsonRpcProvider = await ctx.getProvider()

    // Send the transaction using the sync method via direct JSON-RPC call, since ethers doesn't support it yet
    // This method returns the receipt directly, not just the transaction hash
    const rawReceipt = await jsonRpcProvider.send('eth_sendRawTransactionSync', [input.signedTx])

    // Format the raw JSON response into a proper ethers TransactionReceipt object
    return jsonRpcProvider.formatter.receipt(rawReceipt)
  }

  return {
    prepareTransaction,
    signTransaction,
    signTypedData,
    sendTransaction,
    sendTransactionSync,
  }
}

export function createBundledDelegationTransactionSignerService(ctx: {
  delegationInfo: DelegationCheckResult
  getAccount: () => SignerMnemonicAccountMeta
  getProvider: () => Promise<Provider>
  getSignerManager: () => SignerManager
  getViemClient: () => Promise<PublicClient>
}): TransactionSigner {
  const baseTransactionSignerService = createTransactionSignerService(ctx)

  // private method
  const getSigner = async (): Promise<NativeSigner> => {
    const signerManager = ctx.getSignerManager()
    const signer = await signerManager.getSignerForAccount(ctx.getAccount())
    return signer.connect(await ctx.getProvider())
  }

  const signTransaction: TransactionSigner['signTransaction'] = async (input) => {
    const signer = await getSigner()
    const account = await ctx.getAccount()
    const chainId = input.chainId

    if (!chainId) {
      throw new Error('Chain ID is required')
    }
    if (!ctx.delegationInfo.contractAddress) {
      throw new Error('Delegation contract address is required')
    }
    const delegationContractAddress = getValidAddress({
      address: ctx.delegationInfo.contractAddress,
      platform: Platform.EVM,
      withEVMChecksum: true,
    }) as Nullable<HexString>
    if (!delegationContractAddress) {
      throw new Error('Delegation contract address is invalid')
    }

    const walletAddress = getValidAddress({
      address: account.address,
      chainId,
      withEVMChecksum: true,
    }) as Nullable<HexString>
    if (!walletAddress) {
      throw new Error('Wallet address is invalid')
    }

    // Authorization nonce needs to be +1 of the nonce of the transaction
    const authorizationNonce = Number(input.nonce) + 1
    const signedAuthorization = await createSignedAuthorization({
      signer,
      walletAddress,
      chainId,
      contractAddress: delegationContractAddress,
      nonce: authorizationNonce,
    })

    // Convert to EIP-7702 transaction format
    const viemTxRequest = convertToEIP7702({
      ethersTx: input,
      walletAddress,
      signedAuthorization,
    })
    const signedTx = await signAndSerializeEIP7702Transaction({
      signer,
      tx: viemTxRequest,
      address: account.address,
      chainId,
    })

    return signedTx
  }

  const signTypedData: TransactionSigner['signTypedData'] = async (input) => {
    const signer = await getSigner()
    const signedData = await signTypedDataFunction({
      domain: input.domain,
      types: input.types,
      value: input.value,
      signer,
    })
    return signedData
  }

  const sendTransaction: TransactionSigner['sendTransaction'] = async (input) => {
    const viemClient = await ctx.getViemClient()
    const transactionHash = await viemClient.sendRawTransaction({
      serializedTransaction: input.signedTx,
    })
    return transactionHash
  }

  const sendTransactionSync: TransactionSigner['sendTransactionSync'] = async (input) => {
    // For bundled delegation transactions, we fall back to the base implementation
    // since the sync behavior is handled at the provider level
    // Once Viem exposes the sync method, we can remove this and use it directly
    return baseTransactionSignerService.sendTransactionSync(input)
  }

  return {
    prepareTransaction: baseTransactionSignerService.prepareTransaction,
    signTransaction,
    signTypedData,
    sendTransaction,
    sendTransactionSync,
  }
}
