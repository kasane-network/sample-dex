/* eslint-disable max-params */
import { supportedChainIdFromGQLChain } from 'dataLayer/data/util'
import type { Currency } from '@uniswap/sdk-core'
import { BackendApi } from '@universe/api'
import { Flex, styled, Text } from 'ui/src'
import { Arrow } from 'ui/src/components/arrow/Arrow'
import { iconSizes } from 'ui/src/theme'
import { NetworkLogo } from 'uniswap/src/components/CurrencyLogo/NetworkLogo'
import i18n from 'uniswap/src/i18n'

function getChainIdFromGqlTokenOrCurrency(token?: BackendApi.TokenAssetPartsFragment | Currency): number | null {
  if (!token) {
    return null
  }
  if ('chainId' in token) {
    return token.chainId
  }
  return supportedChainIdFromGQLChain(token.chain) ?? null
}

const StyledBridgeAmountText = styled(Text, {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  variant: 'body2',
})

export function getBridgeDescriptor({
  tokenIn,
  inputAmount,
  tokenOut,
  outputAmount,
}: {
  tokenIn?: BackendApi.TokenAssetPartsFragment | Currency
  outputAmount: string
  tokenOut?: BackendApi.TokenAssetPartsFragment | Currency
  inputAmount: string
}) {
  const inputChain = getChainIdFromGqlTokenOrCurrency(tokenIn)
  const outputChain = getChainIdFromGqlTokenOrCurrency(tokenOut)
  return (
    <Flex row alignItems="center" gap="4px">
      <NetworkLogo chainId={inputChain} size={16} borderRadius={6} />
      <StyledBridgeAmountText>
        {inputAmount}&nbsp;{tokenIn?.symbol ?? i18n.t('common.unknown')}
      </StyledBridgeAmountText>
      <Arrow direction="e" color="$neutral3" size={iconSizes.icon16} />
      <NetworkLogo chainId={outputChain} size={16} borderRadius={6} />
      <StyledBridgeAmountText>
        {outputAmount}&nbsp;{tokenOut?.symbol ?? i18n.t('common.unknown')}
      </StyledBridgeAmountText>
    </Flex>
  )
}
