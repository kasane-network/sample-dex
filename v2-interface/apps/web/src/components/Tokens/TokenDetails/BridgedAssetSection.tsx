import { useModalState } from 'hooks/useModalState'
import { useAtom } from 'jotai'
import { useTDPContext } from 'pages/TokenDetails/TDPContext'
import { useNavigate } from 'react-router'
import { BridgedAssetModalAtom } from 'uniswap/src/components/BridgedAsset/BridgedAssetModal'
import { BridgedAssetTDPSection } from 'uniswap/src/components/BridgedAsset/BridgedAssetTDPSection'
import { fromGraphQLChain } from 'uniswap/src/features/chains/utils'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'
import { useEvent } from 'utilities/src/react/hooks'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'

export function BridgedAssetSection(): JSX.Element | null {
  const { tokenQuery } = useTDPContext()
  const tokenQueryData = tokenQuery.data?.token
  const chainId = fromGraphQLChain(tokenQueryData?.chain)
  const currencyInfo = useCurrencyInfo(
    chainId && tokenQueryData?.address ? buildCurrencyId(chainId, tokenQueryData.address) : undefined,
  )
  const navigate = useNavigate()
  const { toggleModal, closeModal } = useModalState(ModalName.BridgedAsset)
  const [, setBridgedAssetModal] = useAtom(BridgedAssetModalAtom)

  const isBridgedAsset = currencyInfo && Boolean(currencyInfo.isBridged)
  const handlePress = useEvent(() => {
    if (isBridgedAsset) {
      setBridgedAssetModal({
        currencyInfo0: currencyInfo,
        onContinue: () => {
          if (tokenQueryData) {
            const chainUrlParam = chainId ? getChainInfo(chainId).interfaceName : tokenQueryData.chain.toLowerCase()
            navigate(`/swap/?chain=${chainUrlParam}&outputCurrency=${tokenQueryData.address}`)
            closeModal()
          }
        },
      })
      toggleModal()
    }
  })

  if (!isBridgedAsset) {
    return null
  }

  return <BridgedAssetTDPSection currencyInfo={currencyInfo} onPress={handlePress} />
}
