import { ActionTileWithIconAnimation } from 'components/ActionTiles/ActionTileWithIconAnimation'
import { SendButtonTooltip } from 'components/ActionTiles/SendActionTile/SendButtonTooltip'
import { useActiveAddresses } from 'features/accounts/store/hooks'
import { useTranslation } from 'react-i18next'
import { FlexProps } from 'ui/src'
import { SendAction } from 'ui/src/components/icons/SendAction'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import Trace from 'uniswap/src/features/telemetry/Trace'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'

export function SendActionTile({ onPress, padding }: { onPress?: () => void; padding?: FlexProps['p'] }): JSX.Element {
  const { t } = useTranslation()
  const { evmAddress, svmAddress } = useActiveAddresses()

  const isSendDisabled = true
  const onPressSend = () => {
    onPress?.()
  }

  return (
    <Trace logPress element={ElementName.PortfolioActionSend}>
      <SendButtonTooltip isSolanaOnlyWallet={Boolean(svmAddress && !evmAddress)}>
        <ActionTileWithIconAnimation
          dataTestId={TestID.Send}
          Icon={SendAction}
          name={t('common.send.button')}
          onClick={onPressSend}
          disabled={isSendDisabled}
          padding={padding}
        />
      </SendButtonTooltip>
    </Trace>
  )
}
