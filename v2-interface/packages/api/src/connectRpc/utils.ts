import { type PlainMessage } from '@bufbuild/protobuf'
import { Platform, type PlatformAddress, type WalletAccount } from '@uniswap/client-data-api/dist/data/v1/api_pb'
import { ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { type ProtectionInfo as ProtectionInfoProtobuf } from '@uniswap/client-explore/dist/uniswap/explore/v1/service_pb'
import {
  ProtectionAttackType as ProtectionAttackTypeValues,
  ProtectionResult as ProtectionResultValues,
  SafetyLevel as SafetyLevelValues,
} from '@universe/api/src/clients/graphql/generated'
import { logger } from 'utilities/src/logger/logger'

type SafetyLevel = SafetyLevelValues
type ProtectionResult = ProtectionResultValues
type ProtectionAttackType = ProtectionAttackTypeValues
type ProtectionInfo = {
  attackTypes: ProtectionAttackType[]
  result: ProtectionResult
}

/**
 * Helper functions to parse string enum fields from REST API responses.
 *
 * Note: The Protobuf types use string enums instead of strictly typed enums because
 * Protobuf does not allow defining two of the same enum name in the same proto file. (i.e. both ProtectionAttackType and
 * ProtectionResult contain 'UNKNOWN')
 *
 * Since the Explore service just calls GraphQL, we have confidence the string values will match the GraphQL enums.
 * Just validating here!
 */
export function parseSafetyLevel(safetyLevel?: string): SafetyLevel | undefined {
  if (!safetyLevel) {
    return undefined
  }
  switch (safetyLevel) {
    case SafetyLevelValues.Blocked:
      return SafetyLevelValues.Blocked
    case SafetyLevelValues.Verified:
      return SafetyLevelValues.Verified
    case SafetyLevelValues.MediumWarning:
      return SafetyLevelValues.MediumWarning
    case SafetyLevelValues.StrongWarning:
      return SafetyLevelValues.StrongWarning
    default:
      logger.warn(
        'api/clients/connectRpc/utils.ts',
        'parseSafetyLevel',
        `Invalid safetyLevel from REST TokenRankings query: ${safetyLevel}`,
      )
      return undefined
  }
}

function parseProtectionResult(result: string): ProtectionResult | undefined {
  const upper = result.toUpperCase()
  switch (upper) {
    case ProtectionResultValues.Benign:
      return ProtectionResultValues.Benign
    case ProtectionResultValues.Malicious:
      return ProtectionResultValues.Malicious
    case ProtectionResultValues.Spam:
      return ProtectionResultValues.Spam
    case ProtectionResultValues.Unknown:
      return ProtectionResultValues.Unknown
    default:
      return undefined
  }
}

function parseProtectionAttackType(attackType: string): ProtectionAttackType | undefined {
  const upper = attackType.toUpperCase()
  switch (upper) {
    case ProtectionAttackTypeValues.AirdropPattern:
      return ProtectionAttackTypeValues.AirdropPattern
    case ProtectionAttackTypeValues.Honeypot:
      return ProtectionAttackTypeValues.Honeypot
    case ProtectionAttackTypeValues.HighFees:
      return ProtectionAttackTypeValues.HighFees
    case ProtectionAttackTypeValues.Impersonator:
      return ProtectionAttackTypeValues.Impersonator
    case ProtectionAttackTypeValues.Unknown:
      return ProtectionAttackTypeValues.Unknown
    default:
      return undefined
  }
}

export function parseProtectionInfo(protectionInfo?: ProtectionInfoProtobuf): ProtectionInfo | undefined {
  if (!protectionInfo) {
    return undefined
  }

  let protectionResult: ProtectionResult | undefined
  // protectionInfo.result and protectionInfo.attackTypes are a string instead of an enum
  // message TokenProtectionInfo {
  //   string result = 1;
  //   ...
  // }
  // So result and attackTypes are a capitalized string instead of an uppercase enum value
  protectionResult = parseProtectionResult(protectionInfo.result)
  if (!protectionResult) {
    logger.warn(
      'api/clients/connectRpc/utils.ts',
      'parseProtectionInfo',
      `Invalid protectionResult from REST TokenRankings query: ${protectionInfo.result}`,
    )
    return undefined
  }

  const attackTypes = protectionInfo.attackTypes
    .map((attackType) => parseProtectionAttackType(attackType))
    .filter((attackType): attackType is ProtectionAttackType => attackType !== undefined)
  if (attackTypes.length !== protectionInfo.attackTypes.length) {
    logger.warn(
      'api/clients/connectRpc/utils.ts',
      'parseProtectionInfo',
      `Invalid attackTypes in REST TokenRankings query: ${protectionInfo.attackTypes}`,
    )
  }

  return { attackTypes, result: protectionResult }
}

export function parseRestProtocolVersion(version: string | undefined): ProtocolVersion | undefined {
  switch (version?.toLowerCase()) {
    case 'v2':
      return ProtocolVersion.V2
    case 'v3':
      return ProtocolVersion.V3
    case 'v4':
      return ProtocolVersion.V4
    default:
      return undefined
  }
}

/**
 * Helps simplify REST endpoint interfaces that expect a walletAccount object instead
 * of simple address fields
 */
function createWalletAccount({ evmAddress, svmAddress }: { evmAddress?: string; svmAddress?: string }): {
  walletAccount: PlainMessage<WalletAccount>
} {
  const platformAddresses: PlainMessage<PlatformAddress>[] = []

  if (evmAddress) {
    platformAddresses.push({ platform: Platform.EVM, address: evmAddress })
  }

  if (svmAddress) {
    platformAddresses.push({ platform: Platform.SVM, address: svmAddress })
  }

  return {
    walletAccount: {
      platformAddresses,
    },
  }
}

export type WithoutWalletAccount<T> = Omit<T, 'walletAccount'>

/**
 * Helper function to transform input that includes evmAddress/svmAddress to use walletAccount instead
 */
export function transformInput<T extends Record<string, unknown> & { walletAccount?: never }>(
  input: (T & { evmAddress?: string; svmAddress?: string }) | undefined,
):
  | (Omit<T, 'evmAddress' | 'svmAddress' | 'walletAccount'> & { walletAccount: PlainMessage<WalletAccount> })
  | undefined {
  if (!input) {
    return undefined
  }

  const { evmAddress, svmAddress, walletAccount: _walletAccount, ...restInput } = input

  return {
    ...restInput,
    ...createWalletAccount({ evmAddress, svmAddress }),
  }
}
