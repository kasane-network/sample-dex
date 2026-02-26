/* eslint-disable max-lines */
import { datadogRum } from '@datadog/browser-rum'
import type { TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider'
import type { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { TradeType } from '@uniswap/sdk-core'
import { FetchError, TradingApi } from '@universe/api'
import { BlockedAsyncSubmissionChainIdsConfigKey, DynamicConfigs, getDynamicConfigValue } from '@universe/gating'
import { wagmiConfig } from 'components/Web3Provider/wagmiConfig'
import { clientToProvider } from 'hooks/useEthersProvider'
import ms from 'ms'
import type { Action } from 'redux'
import { getRoutingForTransaction } from 'state/activity/utils'
import type { TransactionDetails, TransactionInfo, VitalTxFields } from 'state/transactions/types'
import { isPendingTx } from 'state/transactions/utils'
import type { InterfaceState } from 'state/webReducer'
import type { SagaGenerator } from 'typed-redux-saga'
import { call, cancel, delay, fork, put, race, select, spawn, take } from 'typed-redux-saga'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { isL2ChainId, isUniverseChainId } from 'uniswap/src/features/chains/utils'
import {
  ApprovalEditedInWalletError,
  HandledTransactionInterrupt,
  TransactionError,
  TransactionStepFailedError,
  UnexpectedTransactionStateError,
} from 'uniswap/src/features/transactions/errors'
import {
  addTransaction,
  finalizeTransaction,
  interfaceUpdateTransactionInfo,
} from 'uniswap/src/features/transactions/slice'
import { TokenApprovalTransactionStep } from 'uniswap/src/features/transactions/steps/approve'
import type { Permit2TransactionStep } from 'uniswap/src/features/transactions/steps/permit2Transaction'
import { TokenRevocationTransactionStep } from 'uniswap/src/features/transactions/steps/revoke'
import type {
  HandleApprovalStepParams,
  HandleOnChainPermit2TransactionStep,
  HandleOnChainStepParams,
  HandleSignatureStepParams,
  OnChainTransactionStep,
  TransactionStep,
} from 'uniswap/src/features/transactions/steps/types'
import { TransactionStepType } from 'uniswap/src/features/transactions/steps/types'
import { SolanaTrade } from 'uniswap/src/features/transactions/swap/types/solana'
import type {
  BridgeTrade,
  ChainedActionTrade,
  ClassicTrade,
  KasaneV2Trade,
  UniswapXTrade,
} from 'uniswap/src/features/transactions/swap/types/trade'
import { extractRevertReason } from 'uniswap/src/features/transactions/swap/review/services/swapTxAndGasInfoService/evm/utils'
import { isUniswapX } from 'uniswap/src/features/transactions/swap/utils/routing'
import type {
  ApproveTransactionInfo,
  BridgeTransactionInfo,
  ExactInputSwapTransactionInfo,
  ExactOutputSwapTransactionInfo,
  InterfaceTransactionDetails,
  Permit2ApproveTransactionInfo,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import {
  TransactionOriginType,
  TransactionStatus,
  TransactionType,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import { getInterfaceTransaction, isInterfaceTransaction } from 'uniswap/src/features/transactions/types/utils'
import { areAddressesEqual } from 'uniswap/src/utils/addresses'
import { parseERC20ApproveCalldata } from 'uniswap/src/utils/approvals'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { interruptTransactionFlow } from 'uniswap/src/utils/saga'
import { HexString, isValidHexString } from 'utilities/src/addresses/hex'
import { logger } from 'utilities/src/logger/logger'
import { noop } from 'utilities/src/react/noop'
import { hexlifyTransaction } from 'utilities/src/transactions/hexlifyTransaction'
import { signTypedData } from 'utils/signing'
import { didUserReject } from 'utils/swapErrorToUserReadableMessage'
import type { Transaction } from 'viem'
import { getBlock, getConnectorClient, getTransaction, getTransactionReceipt } from 'wagmi/actions'

export enum TransactionBreadcrumbStatus {
  Initiated = 'initiated',
  Complete = 'complete',
  InProgress = 'in progress',
  Interrupted = 'interrupted',
}

export function* handleSignatureStep({ setCurrentStep, step, ignoreInterrupt, address }: HandleSignatureStepParams) {
  // Add a watcher to check if the transaction flow is interrupted during this step
  const { throwIfInterrupted } = yield* watchForInterruption(ignoreInterrupt)

  addTransactionBreadcrumb({
    step,
    data: {
      domain: JSON.stringify(step.domain),
      values: JSON.stringify(step.values),
      types: JSON.stringify(step.types),
    },
  })

  // Trigger UI prompting user to accept
  setCurrentStep({ step, accepted: false })

  const signer = yield* call(getSigner, address)
  const signature = yield* call(signTypedData, { signer, domain: step.domain, types: step.types, value: step.values }) // TODO(WEB-5077): look into removing / simplifying signTypedData
  // If the transaction flow was interrupted, throw an error after the step has completed
  yield* call(throwIfInterrupted)

  addTransactionBreadcrumb({ step, data: { signature }, status: TransactionBreadcrumbStatus.Complete })

  return signature
}

export function* handleOnChainStep<T extends OnChainTransactionStep>(params: HandleOnChainStepParams<T>) {
  const {
    address,
    step,
    setCurrentStep,
    info,
    allowDuplicativeTx,
    ignoreInterrupt,
    onModification,
    shouldWaitForConfirmation,
  } = params
  const { chainId } = step.txRequest

  addTransactionBreadcrumb({ step, data: { ...info } })

  // Avoid sending prompting a transaction if the user already submitted an equivalent tx, e.g. by closing and reopening a transaction flow
  const duplicativeTx = yield* findDuplicativeTx({ info, address, chainId, allowDuplicativeTx })

  const interfaceDuplicativeTx = duplicativeTx ? getInterfaceTransaction(duplicativeTx) : undefined
  if (interfaceDuplicativeTx && interfaceDuplicativeTx.hash) {
    if (interfaceDuplicativeTx.status === TransactionStatus.Success) {
      addTransactionBreadcrumb({
        step,
        data: { duplicativeTx: true, hash: interfaceDuplicativeTx.hash },
        status: TransactionBreadcrumbStatus.Complete,
      })
      return interfaceDuplicativeTx.hash
    } else {
      addTransactionBreadcrumb({
        step,
        data: { duplicativeTx: true, hash: interfaceDuplicativeTx.hash },
        status: TransactionBreadcrumbStatus.InProgress,
      })
      setCurrentStep({ step, accepted: true })
      return yield* handleOnChainConfirmation(params, interfaceDuplicativeTx.hash)
    }
  }

  // Add a watcher to check if the transaction flow during user input
  const { throwIfInterrupted } = yield* watchForInterruption(ignoreInterrupt)

  // Trigger UI prompting user to accept
  setCurrentStep({ step, accepted: false })

  let transaction: InterfaceTransactionDetails
  const createTransaction = (hash: string): InterfaceTransactionDetails => ({
    id: hash,
    from: address,
    typeInfo: info,
    hash,
    chainId,
    routing: getRoutingForTransaction(info),
    transactionOriginType: TransactionOriginType.Internal,
    status: TransactionStatus.Pending,
    addedTime: Date.now(),
    options: {
      request: {
        to: step.txRequest.to,
        from: address,
        data: step.txRequest.data,
        value: step.txRequest.value,
        gasLimit: step.txRequest.gasLimit,
        gasPrice: step.txRequest.gasPrice,
        nonce: step.txRequest.nonce,
        chainId: step.txRequest.chainId,
      },
    },
  })

  // Kasane + MetaMask can fail in async submission path due to wallet-side preflight with unsupported blockTag.
  // Force signer.sendTransaction path for Kasane.
  const defaultBlockedAsyncSubmissionChainIds: UniverseChainId[] = [UniverseChainId.Kasane]
  const blockedAsyncSubmissionChainIds = getDynamicConfigValue({
    config: DynamicConfigs.BlockedAsyncSubmissionChainIds,
    key: BlockedAsyncSubmissionChainIdsConfigKey.ChainIds,
    defaultValue: defaultBlockedAsyncSubmissionChainIds,
  })
  const forceSyncSubmission = chainId === UniverseChainId.Kasane
  if (chainId === UniverseChainId.Kasane) {
    logger.info('transactions/utils', 'handleOnChainStep', 'Submission mode resolved', {
      chainId,
      stepType: step.type,
      forceSyncSubmission,
      blockedAsyncByConfig: blockedAsyncSubmissionChainIds.includes(chainId),
      shouldWaitForConfirmation: Boolean(shouldWaitForConfirmation),
    })
  }

  // Prompt wallet to submit transaction
  // If should wait for confirmation, we block until the transaction is confirmed
  // Otherwise, we submit the transaction and return the hash immediately and spawn a detection task to check for modifications
  if (forceSyncSubmission || blockedAsyncSubmissionChainIds.includes(chainId) || shouldWaitForConfirmation) {
    const { hash, data, nonce } = yield* call(submitTransaction, params)
    transaction = createTransaction(hash)

    // Add transaction to local state to start polling for status
    yield* put(addTransaction(transaction))

    if (step.txRequest.data !== data && onModification) {
      yield* call(onModification, { hash, data, nonce })
    }
  } else {
    const hash = yield* call(submitTransactionAsync, params)
    transaction = createTransaction(hash)

    // Add transaction to local state to start polling for status
    yield* put(addTransaction(transaction))

    if (onModification) {
      yield* spawn(handleOnModificationAsync, { onModification, hash, step })
    }
  }

  // Trigger waiting UI after user accepts
  setCurrentStep({ step, accepted: true })

  // If the transaction flow was interrupted while awaiting input, throw an error after input is received
  yield* call(throwIfInterrupted)

  if (!transaction.hash) {
    throw new TransactionStepFailedError({ message: `Transaction failed, no hash returned`, step })
  }

  return yield* handleOnChainConfirmation(params, transaction.hash)
}

/** Waits for a transaction to complete, or immediately throws if interrupted. */
function* handleOnChainConfirmation(params: HandleOnChainStepParams, hash: string): SagaGenerator<string> {
  const { step, shouldWaitForConfirmation = true, ignoreInterrupt } = params
  if (!shouldWaitForConfirmation) {
    return hash
  }

  // Delay returning until transaction is confirmed
  if (ignoreInterrupt) {
    yield* call(waitForTransaction, hash, step)
    return hash
  }

  const { interrupt }: { interrupt?: Action } = yield* race({
    transactionFinished: call(waitForTransaction, hash, step),
    interrupt: take(interruptTransactionFlow.type),
  })

  if (interrupt) {
    throw new HandledTransactionInterrupt('Transaction flow was interrupted')
  }

  addTransactionBreadcrumb({ step, data: { txHash: hash }, status: TransactionBreadcrumbStatus.Complete })

  return hash
}

function* handleOnModificationAsync({
  onModification,
  hash,
  step,
}: {
  onModification: NonNullable<HandleOnChainStepParams['onModification']>
  hash: HexString
  step: OnChainTransactionStep
}) {
  const { data, nonce } = yield* call(recoverTransactionFromHash, hash, step)
  if (step.txRequest.data !== data) {
    yield* call(onModification, { hash, data, nonce })
  }
}

/** Submits a transaction and handles potential wallet errors */
function* submitTransaction(params: HandleOnChainStepParams): SagaGenerator<VitalTxFields> {
  const { address, step } = params
  const signer = yield* call(getSigner, address)
  const isKasane = step.txRequest.chainId === UniverseChainId.Kasane

  try {
    let txRequestToSend: TransactionRequest = step.txRequest
    if (isKasane) {
      let sanitizedTxRequest = sanitizeTransactionRequestForWallet(step.txRequest)
      sanitizedTxRequest = yield* call(prepareKasaneTxRequestForWallet, {
        address,
        step,
        txRequest: sanitizedTxRequest,
      })
      const droppedFields = getDroppedUnsupportedTxFields(step.txRequest)
      logger.info('transactions/utils', 'submitTransaction', 'Sending transaction via signer.sendTransaction', {
        chainId: step.txRequest.chainId,
        stepType: step.type,
        txRequestKeys: Object.keys(step.txRequest as object),
        sanitizedTxRequestKeys: Object.keys(sanitizedTxRequest as object),
        droppedFields,
        to: sanitizedTxRequest.to,
        hasData: Boolean(sanitizedTxRequest.data),
        value: sanitizedTxRequest.value?.toString(),
        nonce: sanitizedTxRequest.nonce?.toString(),
      })
      if (droppedFields.length) {
        logger.warn(
          'transactions/utils',
          'submitTransaction',
          'Dropped unsupported tx request fields for signer.sendTransaction',
          {
            droppedFields,
            chainId: step.txRequest.chainId,
            to: step.txRequest.to,
          },
        )
      }
      txRequestToSend = sanitizedTxRequest
      const response = yield* call([signer, 'sendTransaction'], txRequestToSend)
      const txFields = transformTransactionResponse(response)
      const resolvedHash = yield* call(resolveSubmittedHash, {
        requestedHash: txFields.hash as HexString,
        address,
        nonce: txRequestToSend.nonce ?? txFields.nonce,
        chainId: step.txRequest.chainId,
      })
      return {
        ...txFields,
        hash: resolvedHash,
      }
    }

    const response = yield* call([signer, 'sendTransaction'], txRequestToSend)
    return transformTransactionResponse(response)
  } catch (error) {
    const rpcError = extractRpcErrorInfo(error)
    logger.error(new Error('signer.sendTransaction failed'), {
      tags: { file: 'transactions/utils.ts', function: 'submitTransaction' },
      extra: {
        chainId: step.txRequest.chainId,
        stepType: step.type,
        to: step.txRequest.to,
        hasData: Boolean(step.txRequest.data),
        value: step.txRequest.value?.toString(),
        nonce: step.txRequest.nonce?.toString(),
        rpcErrorCode: rpcError.code,
        rpcErrorMessage: rpcError.message,
        rpcErrorData: rpcError.data,
      },
    })
    if (error && typeof error === 'object' && 'transactionHash' in error && isValidHexString(error.transactionHash)) {
      return yield* recoverTransactionFromHash(error.transactionHash, step)
    }
    throw error
  }
}

/** Submits a transaction and handles potential wallet errors */
function* submitTransactionAsync(params: HandleOnChainStepParams): SagaGenerator<HexString> {
  const { address, step } = params
  const signer = yield* call(getSigner, address)
  let txRequestToSend: TransactionRequest = step.txRequest

  try {
    if (step.txRequest.chainId === UniverseChainId.Kasane) {
      const sanitizedTxRequest = sanitizeTransactionRequestForWallet(step.txRequest)
      txRequestToSend = yield* call(prepareKasaneTxRequestForWallet, { address, step, txRequest: sanitizedTxRequest })
    }

    const rpcTransactionRequest = createEthSendTransactionPayload(address, txRequestToSend)
    if (step.txRequest.chainId === UniverseChainId.Kasane) {
      logger.info('transactions/utils', 'submitTransactionAsync', 'Kasane eth_sendTransaction payload prepared', {
        chainId: step.txRequest.chainId,
        stepType: step.type,
        payloadKeys: Object.keys(rpcTransactionRequest),
        to: rpcTransactionRequest.to,
        hasData: Boolean(rpcTransactionRequest.data),
        value: rpcTransactionRequest.value?.toString(),
        nonce: rpcTransactionRequest.nonce?.toString(),
        gas: rpcTransactionRequest.gas?.toString(),
        gasPrice: rpcTransactionRequest.gasPrice?.toString(),
        maxFeePerGas: rpcTransactionRequest.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: rpcTransactionRequest.maxPriorityFeePerGas?.toString(),
      })

      if (
        step.type === TransactionStepType.TokenApprovalTransaction ||
        step.type === TransactionStepType.TokenRevocationTransaction
      ) {
        const approvalData = typeof rpcTransactionRequest.data === 'string' ? rpcTransactionRequest.data : undefined
        if (approvalData) {
          try {
            const decodedApproval = parseERC20ApproveCalldata(approvalData)
            logger.info('transactions/utils', 'submitTransactionAsync', 'Kasane approval calldata decoded', {
              chainId: step.txRequest.chainId,
              to: rpcTransactionRequest.to,
              spender: decodedApproval.spender,
              amount: decodedApproval.amount.toString(10),
            })
          } catch {
            logger.warn('transactions/utils', 'submitTransactionAsync', 'Kasane approval calldata decode failed', {
              chainId: step.txRequest.chainId,
              stepType: step.type,
              to: rpcTransactionRequest.to,
            })
          }
        }
      }

      const preflight = yield* call(fetchKasaneRpcCall, {
        method: 'eth_call',
        params: [
          {
            from: typeof rpcTransactionRequest.from === 'string' ? rpcTransactionRequest.from : address,
            to: rpcTransactionRequest.to,
            data: rpcTransactionRequest.data,
            value: typeof rpcTransactionRequest.value === 'string' ? rpcTransactionRequest.value : '0x0',
          },
          'latest',
        ],
      })
      if (preflight.error) {
        logger.warn('transactions/utils', 'submitTransactionAsync', 'Kasane preflight eth_call failed before submit', {
          chainId: step.txRequest.chainId,
          stepType: step.type,
          preflightErrorCode: preflight.error.code,
          preflightErrorMessage: preflight.error.message,
          preflightErrorData: preflight.error.data,
          to: rpcTransactionRequest.to,
        })
      } else {
        logger.info('transactions/utils', 'submitTransactionAsync', 'Kasane preflight eth_call passed before submit', {
          chainId: step.txRequest.chainId,
          stepType: step.type,
          to: rpcTransactionRequest.to,
        })
      }
    }

    const response = yield* call([signer.provider, 'send'], 'eth_sendTransaction', [rpcTransactionRequest])

    if (!isValidHexString(response)) {
      throw new TransactionStepFailedError({ message: `Transaction failed, not a valid hex string: ${response}`, step })
    }

    return yield* call(resolveSubmittedHash, {
      requestedHash: response,
      address,
      nonce: txRequestToSend.nonce ?? step.txRequest.nonce,
      chainId: step.txRequest.chainId,
    })
  } catch (error) {
    const rpcError = extractRpcErrorInfo(error)
    logger.error(new Error('eth_sendTransaction failed'), {
      tags: { file: 'transactions/utils.ts', function: 'submitTransactionAsync' },
      extra: {
        chainId: step.txRequest.chainId,
        to: step.txRequest.to,
        hasData: Boolean(step.txRequest.data),
        value: step.txRequest.value?.toString(),
        nonce: txRequestToSend.nonce?.toString() ?? step.txRequest.nonce?.toString(),
        rpcErrorCode: rpcError.code,
        rpcErrorMessage: rpcError.message,
        rpcErrorData: rpcError.data,
      },
    })

    if (error && typeof error === 'object' && 'transactionHash' in error && isValidHexString(error.transactionHash)) {
      return error.transactionHash
    }

    throw error
  }
}

function extractRpcErrorInfo(error: unknown): {
  code: number | string | undefined
  message: string | undefined
  data: unknown
} {
  if (!error || typeof error !== 'object') {
    return { code: undefined, message: undefined, data: undefined }
  }

  const candidate = error
  const directCode =
    'code' in candidate && (typeof candidate.code === 'number' || typeof candidate.code === 'string')
      ? candidate.code
      : undefined
  const directMessage = 'message' in candidate && typeof candidate.message === 'string' ? candidate.message : undefined
  const directData = 'data' in candidate ? candidate.data : undefined
  const nestedError = 'error' in candidate && typeof candidate.error === 'object' ? candidate.error : undefined
  const nestedData =
    nestedError && typeof nestedError === 'object' && 'data' in nestedError ? nestedError.data : undefined
  const nestedCode =
    nestedError &&
    typeof nestedError === 'object' &&
    'code' in nestedError &&
    (typeof nestedError.code === 'number' || typeof nestedError.code === 'string')
      ? nestedError.code
      : undefined
  const nestedMessage =
    nestedError && typeof nestedError === 'object' && 'message' in nestedError && typeof nestedError.message === 'string'
      ? nestedError.message
      : undefined
  const parsedFromStack = parseRpcErrorFromStack(candidate)

  return {
    code: directCode ?? nestedCode ?? parsedFromStack.code,
    message: directMessage ?? nestedMessage ?? parsedFromStack.message,
    data: directData ?? nestedData ?? parsedFromStack.data,
  }
}

function parseRpcErrorFromStack(value: unknown): {
  code: number | string | undefined
  message: string | undefined
  data: unknown
} {
  if (!value || typeof value !== 'object' || !('stack' in value) || typeof value.stack !== 'string') {
    return { code: undefined, message: undefined, data: undefined }
  }

  const stack = value.stack.trim()
  if (!stack.startsWith('{')) {
    return { code: undefined, message: undefined, data: undefined }
  }

  try {
    const parsed = JSON.parse(stack) as {
      code?: number | string
      message?: string
      data?: unknown
    }
    return {
      code: parsed.code,
      message: parsed.message,
      data: parsed.data,
    }
  } catch {
    return { code: undefined, message: undefined, data: undefined }
  }
}

function* resolveSubmittedHash({
  requestedHash,
  address,
  nonce,
  chainId,
}: {
  requestedHash: HexString
  address: string
  nonce: TransactionRequest['nonce']
  chainId: number
}): SagaGenerator<HexString> {
  if (chainId !== UniverseChainId.Kasane) {
    return requestedHash
  }

  const hashFromReceipt = yield* call(getHashFromMismatchedReceipt, { chainId, requestedHash })
  if (hashFromReceipt) {
    return hashFromReceipt
  }

  const normalizedNonce = normalizeNonceValue(nonce)
  if (normalizedNonce === undefined) {
    return requestedHash
  }

  const transactionByNonce = yield* call(pollForTransactionByNonce, {
    chainId,
    fromAddress: address,
    nonce: normalizedNonce,
    maxPollingMs: 4_000,
    lookbackBlocks: 20,
  })
  if (transactionByNonce && transactionByNonce.hash.toLowerCase() !== requestedHash.toLowerCase()) {
    logger.warn('transactions/utils', 'resolveSubmittedHash', 'Kasane RPC hash mismatch detected during submit', {
      requestedHash,
      observedHash: transactionByNonce.hash,
      nonce: normalizedNonce.toString(),
      fromAddress: address,
      chainId,
    })
    return transactionByNonce.hash as HexString
  }

  return requestedHash
}

function createEthSendTransactionPayload(address: string, txRequest: TransactionRequest): Record<string, unknown> {
  if (txRequest.chainId === UniverseChainId.Kasane) {
    const sourceTxRequest = sanitizeTransactionRequestForWallet(txRequest)
    const { gasLimit, maxFeePerGas, maxPriorityFeePerGas, ...restRequest } = sourceTxRequest
    const droppedFields = getDroppedUnsupportedTxFields(txRequest)
    if (droppedFields.length) {
      logger.warn('transactions/utils', 'createEthSendTransactionPayload', 'Dropped unsupported fields from tx request', {
        droppedFields,
        chainId: txRequest.chainId,
        to: txRequest.to,
      })
    }

    const payload: Record<string, unknown> = {
      from: address,
      ...restRequest,
      ...(gasLimit !== undefined ? { gas: normalizeHexQuantity(gasLimit) } : {}),
      value: normalizeHexQuantity(restRequest.value) ?? '0x0',
      maxFeePerGas: normalizeHexQuantity(maxFeePerGas),
      maxPriorityFeePerGas: normalizeHexQuantity(maxPriorityFeePerGas),
    }

    // MetaMask uses currently selected network; passing chainId here can trigger internal mismatch handling.
    delete payload.chainId
    // Let MetaMask manage nonce to avoid wallet-local nonce tracker conflicts that surface as "submit failed".
    delete payload.nonce

    if (!payload.maxFeePerGas || !payload.maxPriorityFeePerGas) {
      throw new Error('Kasane tx requires EIP-1559 fee fields (maxFeePerGas/maxPriorityFeePerGas)')
    }

    // Remove undefined keys to avoid wallet-side schema issues.
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) {
        delete payload[key]
      }
    }

    return payload
  }

  const sourceTxRequest = hexlifyTransaction(txRequest)
  const {
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ...restRequest
  } = sourceTxRequest
  const hasEip1559Fees = maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined

  const payload: Record<string, unknown> = {
    from: address,
    ...restRequest,
    ...(gasLimit !== undefined ? { gas: gasLimit } : {}),
    ...(hasEip1559Fees
      ? { maxFeePerGas, maxPriorityFeePerGas }
      : {
          ...(gasPrice !== undefined ? { gasPrice } : {}),
          ...(maxFeePerGas !== undefined ? { maxFeePerGas } : {}),
          ...(maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas } : {}),
        }),
  }

  return payload
}

function sanitizeTransactionRequestForWallet(txRequest: TransactionRequest): TransactionRequest {
  const hexlifiedTransactionRequest = hexlifyTransaction(txRequest)
  const hasEip1559Fees =
    hexlifiedTransactionRequest.maxFeePerGas !== undefined && hexlifiedTransactionRequest.maxPriorityFeePerGas !== undefined

  const sanitizedTxRequest: TransactionRequest = {}

  if (hexlifiedTransactionRequest.to !== undefined) {
    sanitizedTxRequest.to = hexlifiedTransactionRequest.to
  }
  if (hexlifiedTransactionRequest.from !== undefined) {
    sanitizedTxRequest.from = hexlifiedTransactionRequest.from
  }
  if (hexlifiedTransactionRequest.data !== undefined) {
    sanitizedTxRequest.data = hexlifiedTransactionRequest.data
  }
  if (hexlifiedTransactionRequest.value !== undefined) {
    sanitizedTxRequest.value = hexlifiedTransactionRequest.value
  }
  if (hexlifiedTransactionRequest.nonce !== undefined) {
    sanitizedTxRequest.nonce = hexlifiedTransactionRequest.nonce
  }
  if (hexlifiedTransactionRequest.chainId !== undefined) {
    sanitizedTxRequest.chainId = hexlifiedTransactionRequest.chainId
  }
  if (hexlifiedTransactionRequest.type !== undefined) {
    sanitizedTxRequest.type = hexlifiedTransactionRequest.type
  }
  if (hexlifiedTransactionRequest.accessList !== undefined) {
    sanitizedTxRequest.accessList = hexlifiedTransactionRequest.accessList
  }

  if (hexlifiedTransactionRequest.gasLimit !== undefined) {
    sanitizedTxRequest.gasLimit = hexlifiedTransactionRequest.gasLimit
  }

  if (hasEip1559Fees) {
    sanitizedTxRequest.maxFeePerGas = hexlifiedTransactionRequest.maxFeePerGas
    sanitizedTxRequest.maxPriorityFeePerGas = hexlifiedTransactionRequest.maxPriorityFeePerGas
  } else if (hexlifiedTransactionRequest.gasPrice !== undefined) {
    sanitizedTxRequest.gasPrice = hexlifiedTransactionRequest.gasPrice
  }

  return sanitizedTxRequest
}

function* prepareKasaneTxRequestForWallet({
  address,
  step,
  txRequest,
}: {
  address: string
  step: HandleOnChainStepParams['step']
  txRequest: TransactionRequest
}): SagaGenerator<TransactionRequest> {
  if (step.txRequest.chainId !== UniverseChainId.Kasane) {
    return txRequest
  }

  let nextTxRequest: TransactionRequest = { ...txRequest }

  if (nextTxRequest.nonce === undefined) {
    const pendingNonceHex = yield* call(fetchKasaneRpcHexResult, {
      method: 'eth_getTransactionCount',
      params: [address, 'pending'],
    })
    nextTxRequest.nonce = pendingNonceHex
  }

  if (nextTxRequest.gasLimit === undefined && nextTxRequest.to) {
    const estimateGasHex = yield* call(fetchKasaneRpcHexResult, {
      method: 'eth_estimateGas',
      params: [
        {
          from: address,
          to: nextTxRequest.to,
          data: nextTxRequest.data,
          value: normalizeHexQuantity(nextTxRequest.value) ?? '0x0',
        },
      ],
    })
    const estimatedGas = BigInt(estimateGasHex)
    nextTxRequest.gasLimit = `0x${((estimatedGas * 12n) / 10n).toString(16)}`
  }

  // Kasane does not support legacy gas pricing in our target flow.
  // Always build EIP-1559 fields and avoid sending gasPrice.
  if (nextTxRequest.maxFeePerGas === undefined || nextTxRequest.maxPriorityFeePerGas === undefined) {
    const maxPriorityFeePerGasHex = yield* call(fetchKasaneRpcHexResult, {
      method: 'eth_maxPriorityFeePerGas',
      params: [],
    })
    const feeHistoryResponse = yield* call(fetchKasaneRpcCall, {
      method: 'eth_feeHistory',
      params: ['0x1', 'latest', []],
    })
    const latestBaseFeePerGasHex = getLatestBaseFeePerGasHex(feeHistoryResponse.result)
    if (!latestBaseFeePerGasHex) {
      throw new Error('Kasane RPC eth_feeHistory returned invalid baseFeePerGas')
    }

    const baseFeePerGas = BigInt(latestBaseFeePerGasHex)
    const maxPriorityFeePerGas = BigInt(maxPriorityFeePerGasHex)
    const maxFeePerGas = baseFeePerGas * 2n + maxPriorityFeePerGas

    nextTxRequest.maxPriorityFeePerGas = `0x${maxPriorityFeePerGas.toString(16)}`
    nextTxRequest.maxFeePerGas = `0x${maxFeePerGas.toString(16)}`
  }
  nextTxRequest.gasPrice = undefined
  nextTxRequest.type = 2

  logger.info('transactions/utils', 'prepareKasaneTxRequestForWallet', 'Prepared Kasane tx request fields', {
    chainId: step.txRequest.chainId,
    stepType: step.type,
    hasNonce: nextTxRequest.nonce !== undefined,
    nonce: nextTxRequest.nonce?.toString(),
    hasGasLimit: nextTxRequest.gasLimit !== undefined,
    gasLimit: nextTxRequest.gasLimit?.toString(),
    hasMaxFeePerGas: nextTxRequest.maxFeePerGas !== undefined,
    maxFeePerGas: nextTxRequest.maxFeePerGas?.toString(),
    hasMaxPriorityFeePerGas: nextTxRequest.maxPriorityFeePerGas !== undefined,
    maxPriorityFeePerGas: nextTxRequest.maxPriorityFeePerGas?.toString(),
    to: nextTxRequest.to,
  })

  return nextTxRequest
}

async function fetchKasaneRpcHexResult({
  method,
  params,
}: {
  method: string
  params: unknown[]
}): Promise<string> {
  const rpcUrl = getKasaneRpcUrl()
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  })
  const json = (await response.json()) as {
    result?: unknown
    error?: { code?: number; message?: string; data?: unknown }
  }

  if (json.error) {
    throw new Error(`Kasane RPC ${method} failed: ${json.error.message ?? 'unknown error'}`)
  }
  if (typeof json.result !== 'string') {
    throw new Error(`Kasane RPC ${method} returned non-hex result`)
  }
  return json.result
}

async function fetchKasaneRpcCall({
  method,
  params,
}: {
  method: string
  params: unknown[]
}): Promise<{
  result?: unknown
  error?: { code?: number; message?: string; data?: unknown }
}> {
  const rpcUrl = getKasaneRpcUrl()
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  })
  return (await response.json()) as {
    result?: unknown
    error?: { code?: number; message?: string; data?: unknown }
  }
}

function getLatestBaseFeePerGasHex(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('baseFeePerGas' in value)) {
    return undefined
  }
  const { baseFeePerGas } = value
  if (!Array.isArray(baseFeePerGas) || baseFeePerGas.length === 0) {
    return undefined
  }
  const last = baseFeePerGas[baseFeePerGas.length - 1]
  if (typeof last !== 'string' || !last.startsWith('0x')) {
    return undefined
  }
  return last
}

function getKasaneRpcUrl(): string {
  const chainInfo = getChainInfo(UniverseChainId.Kasane)
  const url = chainInfo.rpcUrls.default.http[0] ?? chainInfo.rpcUrls.public?.http?.[0] ?? chainInfo.rpcUrls.interface?.http?.[0] ?? ''
  if (!url) {
    throw new Error('Kasane RPC URL is not configured')
  }
  return url
}

function normalizeHexQuantity(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'string') {
    return undefined
  }
  if (!value.startsWith('0x') && !value.startsWith('0X')) {
    return undefined
  }
  const raw = value.slice(2).toLowerCase()
  if (raw.length === 0) {
    return '0x0'
  }
  const normalized = raw.replace(/^0+/, '')
  return `0x${normalized.length > 0 ? normalized : '0'}`
}

function getDroppedUnsupportedTxFields(txRequest: TransactionRequest): string[] {
  const unsupportedFields: Array<'blockTag' | 'ccipReadEnabled' | 'customData'> = ['blockTag', 'ccipReadEnabled', 'customData']
  return unsupportedFields.filter((field) => Object.prototype.hasOwnProperty.call(txRequest, field))
}

/** Polls for transaction details when only hash is known */
function* recoverTransactionFromHash(hash: HexString, step: OnChainTransactionStep): SagaGenerator<VitalTxFields> {
  const { chainId, nonce, from } = step.txRequest
  const transaction = yield* pollForTransaction(hash, chainId)

  if (transaction) {
    return transformTransactionResponse(transaction)
  }

  const hashFromReceipt = yield* call(getHashFromMismatchedReceipt, { chainId, requestedHash: hash })
  if (hashFromReceipt) {
    const transactionFromReceipt = yield* pollForTransaction(hashFromReceipt, chainId)
    if (transactionFromReceipt) {
      return transformTransactionResponse(transactionFromReceipt)
    }
  }

  const normalizedNonce = normalizeNonceValue(nonce)
  const normalizedFrom = normalizeAddress(from)
  if (normalizedNonce !== undefined && normalizedFrom) {
    const transactionByNonce = yield* call(pollForTransactionByNonce, {
      chainId,
      fromAddress: normalizedFrom,
      nonce: normalizedNonce,
      maxPollingMs: isL2ChainId(chainId) ? 12_000 : 24_000,
      lookbackBlocks: 40,
    })

    if (transactionByNonce) {
      if (transactionByNonce.hash.toLowerCase() !== hash.toLowerCase()) {
        logger.warn('transactions/utils', 'recoverTransactionFromHash', 'Kasane RPC hash mismatch recovered by nonce', {
          requestedHash: hash,
          observedHash: transactionByNonce.hash,
          nonce: normalizedNonce.toString(),
          fromAddress: normalizedFrom,
          chainId,
        })
      }
      return transformTransactionResponse(transactionByNonce)
    }
  }

  throw new TransactionStepFailedError({ message: `Transaction not found`, step })
}

/** Polls until transaction is found or timeout is reached */
function* pollForTransaction(hash: HexString, chainId: number) {
  const POLL_INTERVAL = 2_000
  const MAX_POLLING_TIME = isL2ChainId(chainId) ? 12_000 : 24_000
  let elapsed = 0

  while (elapsed < MAX_POLLING_TIME) {
    try {
      return yield* call(getTransaction, wagmiConfig, { chainId, hash })
    } catch {
      yield* delay(POLL_INTERVAL)
      elapsed += POLL_INTERVAL
    }
  }
  return null
}

function* getHashFromMismatchedReceipt({
  chainId,
  requestedHash,
}: {
  chainId: number
  requestedHash: HexString
}): SagaGenerator<HexString | undefined> {
  try {
    const receipt = yield* call(getTransactionReceipt, wagmiConfig, { chainId, hash: requestedHash })
    const observedHash = receipt.transactionHash
    if (!isValidHexString(observedHash)) {
      return undefined
    }
    if (observedHash.toLowerCase() === requestedHash.toLowerCase()) {
      return undefined
    }

    logger.warn('transactions/utils', 'getHashFromMismatchedReceipt', 'RPC receipt hash differs from requested hash', {
      requestedHash,
      observedHash,
      chainId,
    })
    return observedHash
  } catch {
    return undefined
  }
}

function* pollForTransactionByNonce({
  chainId,
  fromAddress,
  nonce,
  maxPollingMs,
  lookbackBlocks,
}: {
  chainId: number
  fromAddress: string
  nonce: bigint
  maxPollingMs: number
  lookbackBlocks: number
}): SagaGenerator<Transaction | undefined> {
  const POLL_INTERVAL = 2_000
  let elapsed = 0
  const normalizedFromAddress = fromAddress.toLowerCase()

  while (elapsed < maxPollingMs) {
    try {
      const latestBlock = yield* call(getBlock, wagmiConfig, { chainId })
      const latestBlockNumber = latestBlock.number
      if (latestBlockNumber !== null && latestBlockNumber !== undefined) {
        const lastScannedBlock = latestBlockNumber > BigInt(lookbackBlocks) ? latestBlockNumber - BigInt(lookbackBlocks) : BigInt(0)
        let currentBlock = latestBlockNumber
        while (currentBlock >= lastScannedBlock) {
          const block = yield* call(getBlock, wagmiConfig, {
            chainId,
            blockNumber: currentBlock,
            includeTransactions: true,
          })
          const transaction = findTransactionBySenderAndNonce(block.transactions, normalizedFromAddress, nonce)
          if (transaction) {
            return transaction
          }
          if (currentBlock === BigInt(0)) {
            break
          }
          currentBlock -= BigInt(1)
        }
      }
    } catch {
      // no-op
    }

    yield* delay(POLL_INTERVAL)
    elapsed += POLL_INTERVAL
  }

  return undefined
}

function findTransactionBySenderAndNonce(
  transactions: readonly unknown[],
  fromAddress: string,
  nonce: bigint,
): Transaction | undefined {
  for (const transaction of transactions) {
    if (!isViemTransaction(transaction)) {
      continue
    }
    if (transaction.from.toLowerCase() !== fromAddress) {
      continue
    }
    const txNonce = normalizeNonceValue(transaction.nonce)
    if (txNonce === nonce) {
      return transaction
    }
  }
  return undefined
}

function isViemTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return 'hash' in value && 'from' in value && 'nonce' in value
}

function normalizeAddress(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return value
}

function normalizeNonceValue(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') {
    return value
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return BigInt(value)
  }
  if (typeof value === 'string' && value.length > 0) {
    try {
      return BigInt(value)
    } catch {
      return undefined
    }
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    const stringValue = value.toString()
    if (typeof stringValue === 'string' && stringValue.length > 0) {
      try {
        return BigInt(stringValue)
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

function normalizeNonceToNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) {
      return parsed
    }
  }
  return 0
}

/** Transforms a TransactionResponse or a Transaction into { hash: string; data: string; nonce: number } */
function transformTransactionResponse(response: TransactionResponse | Transaction): VitalTxFields {
  if ('data' in response) {
    return { hash: response.hash, data: response.data, nonce: response.nonce }
  }
  return { hash: response.hash, data: response.input, nonce: response.nonce }
}

export function* handlePermitTransactionStep(params: HandleOnChainPermit2TransactionStep) {
  const { step } = params
  const info = getPermitTransactionInfo(step)
  return yield* call(handleOnChainStep, { ...params, info })
}

export function* handleApprovalTransactionStep(params: HandleApprovalStepParams) {
  const { step, address } = params
  const info = getApprovalTransactionInfo(step)
  return yield* call(handleOnChainStep, {
    ...params,
    info,
    *onModification({ hash, data }: VitalTxFields) {
      const { isInsufficient, approvedAmount } = checkApprovalAmount(data, step)

      // Update state to reflect hte actual approval amount submitted on-chain
      yield* put(
        interfaceUpdateTransactionInfo({
          chainId: step.txRequest.chainId,
          id: hash,
          address,
          typeInfo: { ...info, approvalAmount: approvedAmount },
        }),
      )

      if (isInsufficient) {
        throw new ApprovalEditedInWalletError({ step })
      }
    },
  })
}

function getApprovalTransactionInfo(
  approvalStep: TokenApprovalTransactionStep | TokenRevocationTransactionStep | Permit2TransactionStep,
): ApproveTransactionInfo {
  return {
    type: TransactionType.Approve,
    tokenAddress: approvalStep.tokenAddress,
    spender: approvalStep.spender,
    approvalAmount: approvalStep.amount,
  }
}

function getPermitTransactionInfo(approvalStep: Permit2TransactionStep): Permit2ApproveTransactionInfo {
  return {
    type: TransactionType.Permit2Approve,
    tokenAddress: approvalStep.token.address,
    spender: approvalStep.spender,
    amount: approvalStep.amount,
  }
}

function checkApprovalAmount(data: string, step: TokenApprovalTransactionStep | TokenRevocationTransactionStep) {
  // step.amount is a base-10 integer string. Keep bigint exactness for uint256 approvals (e.g. MaxUint256).
  const requiredAmount = BigInt(step.amount)
  const submitted = parseERC20ApproveCalldata(data)
  const approvedAmount = submitted.amount.toString(10)

  // Special case: for revoke tx's, the approval is insufficient if anything other than an empty approval was submitted on chain.
  if (step.type === TransactionStepType.TokenRevocationTransaction) {
    return { isInsufficient: submitted.amount !== BigInt(0), approvedAmount }
  }

  const isInsufficient = submitted.amount < requiredAmount
  if (isInsufficient) {
    logger.warn('transactions/utils', 'checkApprovalAmount', 'Approval amount is lower than required', {
      requiredAmount: requiredAmount.toString(10),
      approvedAmount,
      spender: submitted.spender,
      stepType: step.type,
      tokenAddress: step.tokenAddress,
    })
  }

  return { isInsufficient, approvedAmount }
}

function isRecentTx(tx: InterfaceTransactionDetails | TransactionDetails) {
  const currentTime = Date.now()
  const failed = tx.status === TransactionStatus.Failed
  return !failed && currentTime - tx.addedTime < ms('30s') // 30s is an arbitrary upper limit to combat e.g. a duplicative approval to be included in tx steps, caused by polling intervals.
}

function* findDuplicativeTx({
  info,
  address,
  chainId,
  allowDuplicativeTx,
}: {
  info: TransactionInfo
  address: Address
  chainId: number
  allowDuplicativeTx?: boolean
}) {
  if (allowDuplicativeTx) {
    return undefined
  }

  if (!isUniverseChainId(chainId)) {
    throw new Error(`Invalid chainId: ${chainId} is not a valid UniverseChainId`)
  }

  const transactionMap = yield* select((state: InterfaceState) => state.transactions[address]?.[chainId] ?? {})

  const transactionsForAccount = Object.values(transactionMap)
    .filter((tx) =>
      areAddressesEqual({
        addressInput1: { address: tx.from, chainId: tx.chainId },
        addressInput2: { address, chainId },
      }),
    )
    .filter(isInterfaceTransaction)

  // Check all pending and recent transactions
  return transactionsForAccount.find(
    (tx) => (isPendingTx(tx) || isRecentTx(tx)) && JSON.stringify(tx.typeInfo) === JSON.stringify(info),
  )
}

// Saga to wait for the specific action while asyncTask is running
export function* watchForInterruption(ignoreInterrupt = false) {
  if (ignoreInterrupt) {
    return { throwIfInterrupted: noop }
  }

  let wasInterrupted = false
  // In parallel to execution of the current step, we watch for an interrupt
  const watchForInterruptionTask = yield* fork(function* () {
    yield* take(interruptTransactionFlow.type)
    // If the `take` above returns, the interrupt action was dispatched.
    wasInterrupted = true
  })

  function* throwIfInterrupted() {
    // Wait for step to complete before checking if the flow was interrupted.
    if (wasInterrupted) {
      throw new HandledTransactionInterrupt('Transaction flow was interrupted')
    }

    yield* cancel(watchForInterruptionTask)
  }

  return { throwIfInterrupted }
}

/** Returns when a transaction is confirmed in local state. Throws an error if the transaction fails. */
function* waitForTransaction(hash: string | undefined, step: TransactionStep) {
  // If no hash is provided, there's nothing to wait for (e.g., cancelled/expired orders)
  if (!hash) {
    return
  }

  while (true) {
    const { payload } = yield* take<ReturnType<typeof finalizeTransaction>>(finalizeTransaction.type)
    // Note: This function is only used for classic/bridge transactions that have immediate transaction hashes.
    // UniswapX orders use a different flow (handleUniswapXSignatureStep) and don't call this function.
    if (payload.id === hash) {
      if (payload.status === TransactionStatus.Success) {
        return
      } else {
        throw new TransactionStepFailedError({ message: `${step.type} failed on-chain`, step })
      }
    }
  }
}

async function getProvider(): Promise<Web3Provider> {
  const client = await getConnectorClient(wagmiConfig)
  const provider = clientToProvider(client)

  if (!provider) {
    throw new UnexpectedTransactionStateError(`Failed to get provider during transaction flow`)
  }

  return provider
}

export async function getSigner(account: string): Promise<JsonRpcSigner> {
  return (await getProvider()).getSigner(account)
}

type SwapInfo = ExactInputSwapTransactionInfo | ExactOutputSwapTransactionInfo
export function getSwapTransactionInfo(params: {
  trade: ClassicTrade | KasaneV2Trade | BridgeTrade | SolanaTrade | ChainedActionTrade
  isFinalStep?: boolean
  swapStartTimestamp?: number
}): SwapInfo | BridgeTransactionInfo
export function getSwapTransactionInfo(params: {
  trade: UniswapXTrade
  isFinalStep?: boolean
  swapStartTimestamp?: number
}): SwapInfo & { isUniswapXOrder: true }
export function getSwapTransactionInfo({
  trade,
  isFinalStep,
  swapStartTimestamp,
}: {
  trade: ClassicTrade | KasaneV2Trade | BridgeTrade | UniswapXTrade | SolanaTrade | ChainedActionTrade
  isFinalStep?: boolean
  swapStartTimestamp?: number
}): SwapInfo | BridgeTransactionInfo {
  const commonAttributes = {
    inputCurrencyId: currencyId(trade.inputAmount.currency),
    outputCurrencyId: currencyId(trade.outputAmount.currency),
    isFinalStep: isFinalStep ?? true, // If no `isFinalStep` is provided, we assume it's not a multi-step transaction and default to `true`
    swapStartTimestamp,
  }

  if (trade.routing === TradingApi.Routing.BRIDGE) {
    return {
      type: TransactionType.Bridge,
      ...commonAttributes,
      inputCurrencyAmountRaw: trade.inputAmount.quotient.toString(),
      outputCurrencyAmountRaw: trade.outputAmount.quotient.toString(),
      quoteId: trade.quote.requestId,
      depositConfirmed: false,
    }
  }

  return {
    type: TransactionType.Swap,
    ...commonAttributes,
    isUniswapXOrder: isUniswapX(trade),
    ...(trade.tradeType === TradeType.EXACT_INPUT
      ? {
          tradeType: TradeType.EXACT_INPUT,
          inputCurrencyAmountRaw: trade.inputAmount.quotient.toString(),
          expectedOutputCurrencyAmountRaw: trade.outputAmount.quotient.toString(),
          minimumOutputCurrencyAmountRaw: trade.minAmountOut.quotient.toString(),
        }
      : {
          tradeType: TradeType.EXACT_OUTPUT,
          maximumInputCurrencyAmountRaw: trade.maxAmountIn.quotient.toString(),
          outputCurrencyAmountRaw: trade.outputAmount.quotient.toString(),
          expectedInputCurrencyAmountRaw: trade.inputAmount.quotient.toString(),
        }),
  }
}

export function addTransactionBreadcrumb({
  step,
  data = {},
  status = TransactionBreadcrumbStatus.Initiated,
}: {
  step: TransactionStep
  data?: {
    [key: string]: string | number | boolean | undefined | object | null
  }
  status?: TransactionBreadcrumbStatus
}) {
  datadogRum.addAction('Transaction Action', {
    message: `${step.type} ${status}`,
    step: step.type,
    level: 'info',
    data,
  })
}

export function getDisplayableError({
  error,
  step,
  flow = 'swap',
}: {
  error: Error
  step?: TransactionStep
  flow?: string
}): Error | undefined {
  const userRejected = didUserReject(error)
  // If the user rejects a request, or it's a known interruption e.g. trade update, we handle gracefully / do not show error UI
  if (userRejected || error instanceof HandledTransactionInterrupt) {
    const loggableMessage = userRejected ? 'user rejected request' : error.message // for user rejections, avoid logging redundant/long message
    if (step) {
      addTransactionBreadcrumb({
        step,
        status: TransactionBreadcrumbStatus.Interrupted,
        data: { message: loggableMessage },
      })
    }
    return undefined
  } else if (error instanceof TransactionError) {
    return error // If the error was already formatted as a TransactionError, we just propagate
  } else if (step) {
    const isBackendRejection = error instanceof FetchError
    const revertReason = extractRevertReason(error)
    const stepFailureMessage = revertReason ? `${step.type} failed during ${flow}: ${revertReason}` : `${step.type} failed during ${flow}`
    return new TransactionStepFailedError({
      message: stepFailureMessage,
      step,
      isBackendRejection,
      originalError: error,
    })
  } else {
    return error
  }
}
