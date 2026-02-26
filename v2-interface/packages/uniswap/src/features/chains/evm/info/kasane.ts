import { Token } from '@uniswap/sdk-core'
import { GraphQLApi } from '@universe/api'
import { SwapConfigKey } from '@universe/gating'
import { ETHEREUM_LOGO, ICP_LOGO } from 'ui/src/assets'
import { DEFAULT_NATIVE_ADDRESS_LEGACY } from 'uniswap/src/features/chains/evm/rpc'
import { buildChainTokens } from 'uniswap/src/features/chains/evm/tokens'
import {
  GqlChainId,
  NetworkLayer,
  RPCType,
  UniverseChainId,
  UniverseChainInfo,
} from 'uniswap/src/features/chains/types'
import { Platform } from 'uniswap/src/features/platforms/types/Platform'
import { ElementName } from 'uniswap/src/features/telemetry/constants'

const tokens = buildChainTokens({
  stables: {
    USDC: new Token(
      UniverseChainId.Kasane,
      '0x6052dfc3d327bbe13d182e31a207e4c82cf34a5e',
      6,
      'testUSDC',
      'Kasane Test USD Coin',
    ),
  },
})

export const KASANE_CHAIN_INFO = {
  name: 'Kasane',
  id: UniverseChainId.Kasane,
  platform: Platform.EVM,
  assetRepoNetworkName: undefined,
  backendChain: {
    chain: GraphQLApi.Chain.MonadTestnet as GqlChainId,
    backendSupported: false,
    nativeTokenBackendAddress: undefined,
  },
  blockPerMainnetEpochForChainId: 1,
  blockWaitMsBeforeWarning: undefined,
  bridge: undefined,
  docs: 'https://kasane.network/',
  elementName: ElementName.ChainSepolia,
  explorer: {
    name: 'Kasane Explorer',
    url: 'https://explorer-testnet.kasane.network/',
  },
  interfaceName: 'kasane',
  label: 'Kasane',
  logo: ETHEREUM_LOGO,
  nativeCurrency: {
    name: 'Internet Computer',
    symbol: 'ICP',
    decimals: 18,
    address: DEFAULT_NATIVE_ADDRESS_LEGACY,
    logo: ICP_LOGO,
  },
  networkLayer: NetworkLayer.L1,
  pendingTransactionsRetryOptions: undefined,
  rpcUrls: {
    [RPCType.Public]: {
      http: ['https://rpc-testnet.kasane.network'],
    },
    [RPCType.Default]: {
      http: ['https://rpc-testnet.kasane.network'],
    },
    [RPCType.Interface]: {
      http: ['https://rpc-testnet.kasane.network'],
    },
  },
  tokens,
  statusPage: undefined,
  supportsV4: false,
  supportsNFTs: false,
  testnet: false,
  urlParam: 'kasane',
  wrappedNativeCurrency: {
    name: 'Wrapped ICP',
    symbol: 'WICP',
    decimals: 18,
    address: '0x4dfc4b47164ac7d42507bf1f9cca1bcddc0eee79',
  },
  gasConfig: {
    send: {
      configKey: SwapConfigKey.EthSendMinGasAmount,
      default: 20,
    },
    swap: {
      configKey: SwapConfigKey.EthSwapMinGasAmount,
      default: 150,
    },
  },
  tradingApiPollingIntervalMs: 500,
} as const satisfies UniverseChainInfo
