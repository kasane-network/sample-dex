import TokenDetails from 'components/Tokens/TokenDetails'
import { useCreateTDPChartState } from 'components/Tokens/TokenDetails/ChartSection'
import { TokenDetailsPageSkeleton } from 'components/Tokens/TokenDetails/Skeleton'
import { DEFAULT_CHAIN_ID } from 'constants/chains'
import { NATIVE_CHAIN_ID } from 'constants/tokens'
import { useSrcColor } from 'hooks/useColor'
import { ExploreTab } from 'pages/Explore/constants'
import { useDynamicMetatags } from 'pages/metatags'
import { LoadedTDPContext, PendingTDPContext, TDPProvider } from 'pages/TokenDetails/TDPContext'
import { getTokenPageDescription, getTokenPageTitle } from 'pages/TokenDetails/utils'
import { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet-async/lib/index'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router'
import { formatTokenMetatagTitleName } from 'shared-cloud/metatags'
import { useSporeColors } from 'ui/src'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { useCurrencyInfoWithLoading } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { buildCurrencyId, buildNativeCurrencyId } from 'uniswap/src/utils/currencyId'
import { useChainIdFromUrlParam } from 'utils/chainParams'
import { getNativeTokenDBAddress } from 'utils/nativeTokens'

function useCreateTDPContext(): PendingTDPContext | LoadedTDPContext {
  const { tokenAddress } = useParams<{ tokenAddress: string; chainName: string }>()
  if (!tokenAddress) {
    throw new Error('Invalid token details route: token address URL param is undefined')
  }

  const currencyChainInfo = getChainInfo(useChainIdFromUrlParam() ?? DEFAULT_CHAIN_ID)
  const isNative = tokenAddress === NATIVE_CHAIN_ID
  const tokenDBAddress = isNative ? getNativeTokenDBAddress(currencyChainInfo.backendChain.chain) : tokenAddress
  const currencyId = isNative ? buildNativeCurrencyId(currencyChainInfo.id) : buildCurrencyId(currencyChainInfo.id, tokenAddress)

  const { currencyInfo, loading } = useCurrencyInfoWithLoading(currencyId)
  const currency = useMemo(() => {
    if (isNative) {
      return nativeOnChain(currencyChainInfo.id)
    }
    return currencyInfo?.currency
  }, [currencyInfo?.currency, isNative, currencyChainInfo.id])

  const chartState = useCreateTDPChartState(tokenDBAddress, currencyChainInfo.backendChain.chain)

  const tokenQuery = useMemo(
    () => ({
      data: undefined,
      loading,
      error: undefined,
    }),
    [loading],
  )

  const colors = useSporeColors()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const { preloadedLogoSrc } = (useLocation().state as { preloadedLogoSrc?: string }) ?? {}
  const tokenColor =
    useSrcColor({
      src: preloadedLogoSrc,
      currencyName: currency?.name,
      backgroundColor: colors.surface2.val,
    }).tokenColor ?? undefined

  return useMemo(() => {
    return {
      currency,
      currencyChain: currencyChainInfo.backendChain.chain,
      currencyChainId: currencyChainInfo.id,
      address: (currency?.isNative ? NATIVE_CHAIN_ID : currency?.address) ?? tokenAddress,
      tokenQuery,
      chartState,
      multiChainMap: {},
      tokenColor,
    }
  }, [currency, currencyChainInfo.backendChain.chain, currencyChainInfo.id, tokenAddress, tokenQuery, chartState, tokenColor])
}

export default function TokenDetailsPage() {
  const { t } = useTranslation()
  const contextValue = useCreateTDPContext()
  const { address, currency, currencyChain, currencyChainId, tokenQuery } = contextValue
  const navigate = useNavigate()

  const tokenQueryData = tokenQuery.data?.token
  const metatagProperties = useMemo(() => {
    return {
      title: formatTokenMetatagTitleName(tokenQueryData?.symbol ?? currency?.symbol, tokenQueryData?.name ?? currency?.name),
      image:
        window.location.origin +
        '/api/image/tokens/' +
        currencyChain.toLowerCase() +
        '/' +
        (currency?.isNative ? getNativeTokenDBAddress(currencyChain) : address),
      url: window.location.href,
      description: getTokenPageDescription(currency, currencyChainId),
    }
  }, [address, currency, currencyChain, currencyChainId, tokenQueryData?.name, tokenQueryData?.symbol])
  const metatags = useDynamicMetatags(metatagProperties)

  useEffect(() => {
    if (!tokenQuery.loading && !currency) {
      navigate(`/explore?type=${ExploreTab.Tokens}&result=${ModalName.NotFound}`)
    }
  }, [currency, tokenQuery.loading, navigate])

  return (
    <>
      <Helmet>
        <title>{getTokenPageTitle({ t, currency, chainId: currencyChainId })}</title>
        {metatags.map((tag, index) => (
          <meta key={index} {...tag} />
        ))}
      </Helmet>
      {(() => {
        if (tokenQuery.loading || !currency) {
          return <TokenDetailsPageSkeleton />
        }

        return (
          <TDPProvider contextValue={contextValue}>
            <TokenDetails />
          </TDPProvider>
        )
      })()}
    </>
  )
}
