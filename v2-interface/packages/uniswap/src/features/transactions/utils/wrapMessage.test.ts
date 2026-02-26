import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { formatWrapMessageByChain } from 'uniswap/src/features/transactions/utils/wrapMessage'

describe('formatWrapMessageByChain', () => {
  const defaultMessage =
    'Swaps on the Uniswap Protocol can start and end with ETH. However, during the swap, ETH is wrapped into WETH.'

  test('keeps default text when chainId is not provided', () => {
    expect(formatWrapMessageByChain(defaultMessage)).toBe(defaultMessage)
  })

  test('rewrites ETH/WETH symbols for Kasane', () => {
    expect(formatWrapMessageByChain(defaultMessage, UniverseChainId.Kasane)).toContain('ICP')
    expect(formatWrapMessageByChain(defaultMessage, UniverseChainId.Kasane)).toContain('WICP')
    expect(formatWrapMessageByChain(defaultMessage, UniverseChainId.Kasane)).not.toContain(' WETH')
    expect(formatWrapMessageByChain(defaultMessage, UniverseChainId.Kasane)).not.toContain(' ETH')
  })
})
