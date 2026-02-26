import { useAccount } from 'hooks/useAccount'
import { useEthersWeb3Provider } from 'hooks/useEthersProvider'

type Web3ReactLikeContext = {
  account: string | undefined
  active: boolean
  chainId: number | undefined
  provider: ReturnType<typeof useEthersWeb3Provider>
}

export function useWeb3React(): Web3ReactLikeContext {
  const account = useAccount()
  const provider = useEthersWeb3Provider({ chainId: account.chainId })

  return {
    account: account.address,
    active: Boolean(account.address && provider),
    chainId: account.chainId,
    provider,
  }
}
