import { opacifyRaw } from 'ui/src/theme/color/utils'
import { describe, expect, it } from 'vitest'

describe('opacifyRaw', () => {
  it('supports rgb colors', () => {
    expect(opacifyRaw(12.5, 'rgb(255, 255, 255)')).toBe('rgba(255, 255, 255, 0.13)')
  })

  it('supports rgba colors', () => {
    expect(opacifyRaw(12.5, 'rgba(255, 255, 255, 0.38)')).toBe('rgba(255, 255, 255, 0.13)')
  })

  it('supports hex colors', () => {
    expect(opacifyRaw(50, '#ffffff')).toBe('#ffffff80')
  })
})
