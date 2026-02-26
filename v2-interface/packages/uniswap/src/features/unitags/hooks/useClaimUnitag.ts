import { SignMessageFunc, UnitagClaim, UnitagClaimContext } from '@universe/api'
import { useTranslation } from 'react-i18next'
import { getUniqueId } from 'utilities/src/device/uniqueId'
import { logger } from 'utilities/src/logger/logger'

type ClaimUnitagInput = {
  claim: UnitagClaim
  context: UnitagClaimContext
  signMessage?: SignMessageFunc
}

/**
 * A custom async hook that handles the process of claiming a Unitag
 * Hook must be used inside the OnboardingContext
 */
export const useClaimUnitag = (): ((input: ClaimUnitagInput) => Promise<{ claimError?: string }>) => {
  const { t } = useTranslation()

  return async ({ claim, signMessage }: ClaimUnitagInput) => {
    const deviceId = await getUniqueId()

    if (!claim.address || !deviceId || !signMessage) {
      logger.error('Missing required parameters', {
        tags: { file: 'useClaimUnitag', function: 'claimUnitag' },
      })
      return { claimError: t('unitags.claim.error.default') }
    }

    logger.error('Unitags claim is disabled', {
      tags: { file: 'useClaimUnitag', function: 'claimUnitag' },
    })
    return { claimError: t('unitags.claim.error.default') }
  }
}
