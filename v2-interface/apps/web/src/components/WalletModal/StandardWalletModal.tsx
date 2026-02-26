import { WalletModalLayout } from 'components/WalletModal/WalletModalLayout'
import { WalletOptionsGrid } from 'components/WalletModal/WalletOptionsGrid'
import { useTranslation } from 'react-i18next'
import { Flex, Text } from 'ui/src'

export function StandardWalletModal(): JSX.Element {
  const { t } = useTranslation()

  const header = (
    <Flex row justifyContent="space-between" width="100%">
      <Text variant="subheading2">{t('common.connectAWallet.button')}</Text>
    </Flex>
  )

  const walletOptions = <WalletOptionsGrid showMobileConnector={false} />

  return (
    <WalletModalLayout
      header={
        <Flex gap="$gap16">
          {header}
        </Flex>
      }
    >
      {walletOptions}
    </WalletModalLayout>
  )
}
