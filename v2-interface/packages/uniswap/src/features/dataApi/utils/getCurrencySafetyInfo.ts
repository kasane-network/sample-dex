import {
  ProtectionInfo,
  AttackType as RestAttackType,
  ProtectionResult as RestProtectionResult,
  SafetyLevel as RestSafetyLevel,
  SpamCode as RestSpamCode,
  TokenMetadata,
} from '@uniswap/client-data-api/dist/data/v1/types_pb'
import { BackendApi, SpamCode } from '@universe/api'
import { AttackType, SafetyInfo, TokenList } from 'uniswap/src/features/dataApi/types'

function getTokenListFromSafetyLevel(safetyInfo?: BackendApi.SafetyLevel): TokenList {
  switch (safetyInfo) {
    case BackendApi.SafetyLevel.Blocked:
      return TokenList.Blocked
    case BackendApi.SafetyLevel.Verified:
      return TokenList.Default
    default:
      return TokenList.NonDefault
  }
}

// Priority based on Token Protection PRD spec
function getHighestPriorityAttackType(
  attackTypes?: (BackendApi.ProtectionAttackType | undefined)[],
): AttackType | undefined {
  if (!attackTypes || attackTypes.length === 0) {
    return undefined
  }
  const attackTypeSet = new Set(attackTypes)
  if (attackTypeSet.has(BackendApi.ProtectionAttackType.Honeypot)) {
    return AttackType.Honeypot
  } else if (attackTypeSet.has(BackendApi.ProtectionAttackType.Impersonator)) {
    return AttackType.Impersonator
  } else if (attackTypeSet.has(BackendApi.ProtectionAttackType.AirdropPattern)) {
    return AttackType.Airdrop
  } else if (attackTypeSet.has(BackendApi.ProtectionAttackType.HighFees)) {
    return AttackType.HighFees
  } else {
    return AttackType.Other
  }
}

// Priority based on Token Protection PRD spec for REST API
function getHighestPriorityRestAttackType(attackTypes?: RestAttackType[]): AttackType | undefined {
  if (!attackTypes || attackTypes.length === 0) {
    return undefined
  }
  if (attackTypes.includes(RestAttackType.HONEYPOT)) {
    return AttackType.Honeypot
  } else if (attackTypes.includes(RestAttackType.IMPERSONATOR)) {
    return AttackType.Impersonator
  } else if (attackTypes.includes(RestAttackType.AIRDROP_PATTERN)) {
    return AttackType.Airdrop
  } else if (attackTypes.includes(RestAttackType.HIGH_FEES)) {
    return AttackType.HighFees
  } else {
    return AttackType.Other
  }
}

export function getCurrencySafetyInfo(
  safetyLevel?: BackendApi.SafetyLevel,
  protectionInfo?: NonNullable<BackendApi.TokenQuery['token']>['protectionInfo'],
): SafetyInfo {
  return {
    tokenList: getTokenListFromSafetyLevel(safetyLevel),
    attackType: getHighestPriorityAttackType(protectionInfo?.attackTypes),
    protectionResult: protectionInfo?.result ?? BackendApi.ProtectionResult.Unknown,
    blockaidFees: protectionInfo?.blockaidFees
      ? {
          buyFeePercent: protectionInfo.blockaidFees.buy ? protectionInfo.blockaidFees.buy * 100 : undefined,
          sellFeePercent: protectionInfo.blockaidFees.sell ? protectionInfo.blockaidFees.sell * 100 : undefined,
        }
      : undefined,
  }
}

export function mapRestProtectionResultToProtectionResult(result?: RestProtectionResult): BackendApi.ProtectionResult {
  switch (result) {
    case RestProtectionResult.MALICIOUS:
      return BackendApi.ProtectionResult.Malicious
    case RestProtectionResult.SPAM:
      return BackendApi.ProtectionResult.Spam
    case RestProtectionResult.BENIGN:
      return BackendApi.ProtectionResult.Benign
    default:
      return BackendApi.ProtectionResult.Unknown
  }
}

export function getRestCurrencySafetyInfo(
  safetyLevel?: BackendApi.SafetyLevel,
  protectionInfo?: ProtectionInfo,
): SafetyInfo {
  return {
    tokenList: getTokenListFromSafetyLevel(safetyLevel),
    attackType: getHighestPriorityRestAttackType(protectionInfo?.attackTypes),
    protectionResult: mapRestProtectionResultToProtectionResult(protectionInfo?.result),
    blockaidFees: undefined,
  }
}

export function getRestTokenSafetyInfo(metadata?: TokenMetadata): {
  isSpam: boolean
  spamCodeValue: SpamCode
  mappedSafetyLevel: BackendApi.SafetyLevel | undefined
} {
  let isSpam = false
  let spamCodeValue = SpamCode.LOW
  let mappedSafetyLevel: BackendApi.SafetyLevel | undefined

  switch (metadata?.spamCode) {
    case RestSpamCode.SPAM:
    case RestSpamCode.SPAM_URL:
      isSpam = true
      spamCodeValue = SpamCode.HIGH
      break
    case RestSpamCode.NOT_SPAM:
      isSpam = false
      spamCodeValue = SpamCode.LOW
      break
    default:
      break
  }

  switch (metadata?.safetyLevel) {
    case RestSafetyLevel.VERIFIED:
      mappedSafetyLevel = BackendApi.SafetyLevel.Verified
      break
    case RestSafetyLevel.MEDIUM_WARNING:
      mappedSafetyLevel = BackendApi.SafetyLevel.MediumWarning
      break
    case RestSafetyLevel.STRONG_WARNING:
      mappedSafetyLevel = BackendApi.SafetyLevel.StrongWarning
      break
    case RestSafetyLevel.BLOCKED:
      mappedSafetyLevel = BackendApi.SafetyLevel.Blocked
      break
    default:
      break
  }

  return { isSpam, spamCodeValue, mappedSafetyLevel }
}
