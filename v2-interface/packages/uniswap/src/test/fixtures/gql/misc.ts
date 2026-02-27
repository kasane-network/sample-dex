import { BackendApi } from '@universe/api'
import { faker } from 'uniswap/src/test/shared'
import { createFixture } from 'uniswap/src/test/utils'

export const GQL_CHAINS = [
  BackendApi.Chain.MonadTestnet,
  BackendApi.Chain.EthereumSepolia,
  BackendApi.Chain.Arbitrum,
  BackendApi.Chain.Optimism,
  BackendApi.Chain.Polygon,
  BackendApi.Chain.Base,
  BackendApi.Chain.Bnb,
]

export const image = createFixture<BackendApi.Image>()(() => ({
  __typename: 'Image',
  id: faker.datatype.uuid(),
  url: faker.image.imageUrl(),
}))
