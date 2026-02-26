import { toContractInput } from 'dataLayer/data/util'
import { MULTICALL_ADDRESSES, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES as V3NFT_ADDRESSES } from '@uniswap/sdk-core'
import MulticallJSON from '@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json'
import NFTPositionManagerJSON from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import { useWeb3React } from '@web3-react/core'
import { PositionInfo } from 'components/AccountDrawer/MiniPortfolio/Pools/cache'
import { RPC_PROVIDERS } from 'constants/providers'
import { AddressZero } from '@ethersproject/constants'
import { BaseContract } from 'ethers/lib/ethers'
import { useAccount } from 'hooks/useAccount'
import { useMemo } from 'react'
import { NonfungiblePositionManager, UniswapInterfaceMulticall } from 'uniswap/src/abis/types/v3'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { useIsSupportedChainIdCallback } from 'uniswap/src/features/chains/hooks/useSupportedChainId'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { isEVMChain } from 'uniswap/src/features/platforms/utils/chains'
import { isEVMAddressWithChecksum } from 'utilities/src/addresses/evm/evm'
import { getContract } from 'utilities/src/contracts/getContract'
import { CurrencyKey, currencyKey, currencyKeyFromGraphQL } from 'utils/currencyKey'

type ContractMap<T extends BaseContract> = { [key: number]: T }

// Constructs a chain-to-contract map, using the wallet's provider when available
function useContractMultichain<T extends BaseContract>({
  addressMap,
  ABI,
  chainIds,
}: {
  addressMap: { [chainId: number]: string | undefined }
  ABI: any
  chainIds?: UniverseChainId[]
}): ContractMap<T> {
  const account = useAccount()
  const { provider: walletProvider } = useWeb3React()
  const isSupportedChain = useIsSupportedChainIdCallback()

  return useMemo(() => {
    const relevantChains =
      chainIds ??
      Object.keys(addressMap)
        .map((chainId) => parseInt(chainId))
        .filter((chainId) => isSupportedChain(chainId))

    return relevantChains.reduce((acc: ContractMap<T>, chainId) => {
      const isSupported = isSupportedChain(chainId) && isEVMChain(chainId)
      const address = addressMap[chainId]

      const provider =
        walletProvider && account.chainId === chainId
          ? walletProvider
          : isSupported
            ? RPC_PROVIDERS[chainId]
            : undefined
      const hasValidAddress = Boolean(address && address !== AddressZero && isEVMAddressWithChecksum(address))
      if (provider && hasValidAddress) {
        acc[chainId] = getContract({ address, ABI, provider }) as T
      }
      return acc
    }, {})
  }, [ABI, addressMap, chainIds, isSupportedChain, account.chainId, walletProvider])
}

export function useV3ManagerContracts(chainIds: UniverseChainId[]): ContractMap<NonfungiblePositionManager> {
  return useContractMultichain<NonfungiblePositionManager>({
    addressMap: V3NFT_ADDRESSES,
    ABI: NFTPositionManagerJSON.abi,
    chainIds,
  })
}

export function useInterfaceMulticallContracts(chainIds: UniverseChainId[]): ContractMap<UniswapInterfaceMulticall> {
  return useContractMultichain<UniswapInterfaceMulticall>({
    addressMap: MULTICALL_ADDRESSES,
    ABI: MulticallJSON.abi,
    chainIds,
  })
}

type PriceMap = { [key: CurrencyKey]: number | undefined }
export function usePoolPriceMap(positions: PositionInfo[] | undefined) {
  const { defaultChainId } = useEnabledChains()
  void defaultChainId
  const contracts = useMemo(() => {
    void positions
    return []
  }, [positions])
  void contracts
  void toContractInput

  const priceMap = useMemo<PriceMap>(() => ({}), [])
  void currencyKey
  void currencyKeyFromGraphQL

  return { priceMap, pricesLoading: false }
}
