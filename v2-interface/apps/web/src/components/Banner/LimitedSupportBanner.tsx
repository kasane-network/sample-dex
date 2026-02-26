import { useTranslation } from 'react-i18next'
import { Button, Flex, Text } from 'ui/src'

export function LimitedSupportBanner({ onPress }: { onPress: () => void }): JSX.Element {
  const { t } = useTranslation()

  return (
    <Flex
      borderRadius="$rounded12"
      borderWidth="$borderWidth1"
      borderColor="$surface3"
      backgroundColor="$surface1"
      p="$spacing12"
      gap="$spacing8"
      mb="$spacing12"
    >
      <Text variant="body3" color="$neutral2">
        {t('common.warning')}
      </Text>
      <Text variant="body3">{t('account.limitedSupportBanner.message', 'Some features may be limited.')}</Text>
      <Button size="small" emphasis="secondary" onPress={onPress} alignSelf="flex-start">
        {t('common.learnMore')}
      </Button>
    </Flex>
  )
}
