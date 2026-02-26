import { PortfolioLogo } from 'components/AccountDrawer/MiniPortfolio/PortfolioLogo'
import { AssetLogoBaseProps } from 'components/Logo/AssetLogo'
import { DEFAULT_CHAIN_ID } from 'constants/chains'
import { NATIVE_CHAIN_ID } from 'constants/tokens'
import useNativeCurrency from 'lib/hooks/useNativeCurrency'
import { useMemo } from 'react'
import { TokenStat } from 'state/explore/types'
import { fromGraphQLChain } from 'uniswap/src/features/chains/utils'
import { getChainIdFromChainUrlParam } from 'utils/chainParams'

export default function QueryTokenLogo(
  props: AssetLogoBaseProps & {
    token?: TokenStat
  },
) {
  const chainId =
    (props.token?.chain ? fromGraphQLChain(props.token.chain) : undefined) ??
    getChainIdFromChainUrlParam(props.token?.chain?.toLowerCase()) ??
    DEFAULT_CHAIN_ID
  const isNative = props.token?.address === NATIVE_CHAIN_ID

  const nativeCurrency = useNativeCurrency(chainId)
  const currency = isNative ? nativeCurrency : undefined

  const currencies = useMemo(() => (!isNative ? undefined : [currency]), [currency, isNative])

  return <PortfolioLogo currencies={currencies} chainId={chainId} images={[props.token?.logo]} {...props} />
}
