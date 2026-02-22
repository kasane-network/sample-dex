import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTokenRegistry } from '../normalize.mjs'

test('normalizeTokenRegistry deduplicates by chain+address and applies last source', () => {
  const records = normalizeTokenRegistry({
    chainId: 1,
    sources: [
      {
        sourceName: 'a',
        tokens: [
          { chainId: 1, address: '0x00000000000000000000000000000000000000AA', symbol: 'AAA', name: 'Token A', decimals: 18 },
        ],
      },
      {
        sourceName: 'b',
        tokens: [
          { chainId: 1, address: '0x00000000000000000000000000000000000000aa', symbol: 'BBB', name: 'Token B', decimals: 18 },
        ],
      },
    ],
    updatedAtIso: '2026-02-22T00:00:00.000Z',
  })

  assert.equal(records.length, 1)
  assert.equal(records[0].address, '0x00000000000000000000000000000000000000aa')
  assert.equal(records[0].symbol, 'BBB')
  assert.equal(records[0].sourcePrimary, 'b')
})
