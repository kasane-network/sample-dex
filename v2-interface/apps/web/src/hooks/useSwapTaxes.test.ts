import { UniverseChainId } from 'uniswap/src/features/chains/types'

import { supportsFeeOnTransferDetection } from 'hooks/useSwapTaxes'

describe('supportsFeeOnTransferDetection', () => {
  it('returns false for Kasane', () => {
    expect(supportsFeeOnTransferDetection(UniverseChainId.Kasane)).toBe(false)
  })

  it('returns false for chains without detector address', () => {
    expect(supportsFeeOnTransferDetection(UniverseChainId.Mainnet)).toBe(false)
  })

  it('returns true for supported chains', () => {
    expect(supportsFeeOnTransferDetection(UniverseChainId.Base)).toBe(true)
  })
})
