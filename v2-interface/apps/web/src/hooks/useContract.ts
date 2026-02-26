import { Contract } from '@ethersproject/contracts'
import { MULTICALL_ADDRESSES } from '@uniswap/sdk-core'
import UniswapInterfaceMulticallJson from '@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json'
import { useAccount } from 'hooks/useAccount'
import { useEthersProvider } from 'hooks/useEthersProvider'
import { useMemo } from 'react'
import ERC20_ABI from 'uniswap/src/abis/erc20.json'
import { Erc20, Weth } from 'uniswap/src/abis/types'
import { UniswapInterfaceMulticall } from 'uniswap/src/abis/types/v3'
import WETH_ABI from 'uniswap/src/abis/weth.json'
import { WRAPPED_NATIVE_CURRENCY } from 'uniswap/src/constants/tokens'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { getContract } from 'utilities/src/contracts/getContract'
import { logger } from 'utilities/src/logger/logger'

const { abi: MulticallABI } = UniswapInterfaceMulticallJson

// returns null on errors
export function useContract<T extends Contract = Contract>({
  address,
  ABI,
  withSignerIfPossible = true,
  chainId,
}: {
  address?: string
  ABI: any
  withSignerIfPossible?: boolean
  chainId?: UniverseChainId
}): T | null {
  const account = useAccount()
  const provider = useEthersProvider({ chainId: chainId ?? account.chainId })

  return useMemo(() => {
    if (!address || !ABI || !provider) {
      return null
    }
    try {
      return getContract({
        address,
        ABI,
        provider,
        account: withSignerIfPossible && account.address ? account.address : undefined,
      })
    } catch (error) {
      const wrappedError = new Error('failed to get contract', { cause: error })
      logger.warn('useContract', 'useContract', wrappedError.message, {
        error: wrappedError,
        contractAddress: address,
        accountAddress: account.address,
      })
      return null
    }
  }, [address, ABI, provider, withSignerIfPossible, account.address]) as T
}

export function useTokenContract({
  tokenAddress,
  withSignerIfPossible = false,
  chainId,
}: {
  tokenAddress?: string
  withSignerIfPossible?: boolean
  chainId?: UniverseChainId
}) {
  return useContract<Erc20>({
    address: tokenAddress,
    ABI: ERC20_ABI,
    withSignerIfPossible,
    chainId,
  })
}

export function useWETHContract(withSignerIfPossible?: boolean, chainId?: UniverseChainId) {
  return useContract<Weth>({
    address: chainId ? WRAPPED_NATIVE_CURRENCY[chainId]?.address : undefined,
    ABI: WETH_ABI,
    withSignerIfPossible,
    chainId,
  })
}

export function useInterfaceMulticall(chainId?: UniverseChainId) {
  const account = useAccount()
  const chain = chainId ?? account.chainId
  return useContract<UniswapInterfaceMulticall>({
    address: chain ? MULTICALL_ADDRESSES[chain] : undefined,
    ABI: MulticallABI,
    withSignerIfPossible: false,
    chainId: chain,
  }) as UniswapInterfaceMulticall
}
