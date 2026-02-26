import { ReactComponent as UniswapLogo } from 'assets/svg/uniswap_app_logo.svg'
import { useAtom } from 'jotai'
import { useAtomValue } from 'jotai/utils'
import { X } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { hideMobileAppPromoBannerAtom, persistHideMobileAppPromoBannerAtom } from 'state/application/atoms'
import { Flex, styled, Text, useSporeColors } from 'ui/src'
import { isWebAndroid, isWebIOS } from 'utilities/src/platform'

const Wrapper = styled(Flex, {
  height: 56,
  width: '100%',
  backgroundColor: '$accent2',
  pl: '$spacing12',
  pr: '$spacing16',
  zIndex: '$sticky',
  row: true,
  justifyContent: 'space-between',
  alignItems: 'center',
  display: 'none',
  $md: { display: 'flex' },
})

/**
 * We show the mobile app promo banner if:
 * - The user is on a mobile device our app supports
 * - The user is not using Safari (since we don't want to conflict with the Safari-native Smart App Banner)
 * - The user has not dismissed the banner during this session
 * - The user has not clicked the Uniswap wallet or Get Uniswap Wallet buttons in wallet options
 */
export function useMobileAppPromoBannerEligible(): boolean {
  const hideMobileAppPromoBanner = useAtomValue(hideMobileAppPromoBannerAtom)
  const persistHideMobileAppPromoBanner = useAtomValue(persistHideMobileAppPromoBannerAtom)
  return (isWebIOS || isWebAndroid) && !hideMobileAppPromoBanner && !persistHideMobileAppPromoBanner
}

export function MobileAppPromoBanner() {
  const { t } = useTranslation()
  const [, setHideMobileAppPromoBanner] = useAtom(hideMobileAppPromoBannerAtom)
  const colors = useSporeColors()

  return (
    <Wrapper>
      <Flex shrink row gap="$spacing8" alignItems="center">
        <X
          data-testid="mobile-promo-banner-close-button"
          size={20}
          color={colors.neutral2.val}
          onClick={() => {
            setHideMobileAppPromoBanner(true)
          }}
        />
        <UniswapLogo width="32px" height="32px" />
        <Flex shrink>
          <Text variant="body3">{t('mobileAppPromo.banner.title')}</Text>
          <Text variant="body4" color="$neutral2">
            {t('mobileAppPromo.banner.getTheApp.link')}
          </Text>
        </Flex>
      </Flex>
    </Wrapper>
  )
}
