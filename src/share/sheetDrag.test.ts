import { describe, expect, it } from 'vitest'
import { sheetOffset, shouldDismissSheet } from './sheetDrag'
describe('share sheet drag (t170u)', () => {
  it('dismiss past 30% of height', () => {
    expect(shouldDismissSheet(200, 600, 0.1)).toBe(true)
    expect(shouldDismissSheet(150, 600, 0.1)).toBe(false)
  })
  it('fling dismisses short drags, not tiny jitters', () => {
    expect(shouldDismissSheet(60, 600, 1.2)).toBe(true)
    expect(shouldDismissSheet(10, 600, 2)).toBe(false)
  })
  it('upward never dismisses; rubber-bands', () => {
    expect(shouldDismissSheet(-100, 600, 3)).toBe(false)
    expect(sheetOffset(-100)).toBeGreaterThanOrEqual(-12)
    expect(sheetOffset(80)).toBe(80)
  })
})
