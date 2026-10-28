import { describe, expect, it } from 'vitest'
import { AZ_SLOT_COUNT } from '../../../lib/azScrubber'
import {
  CK_AZ_LETTER_MIN_PX,
  azAbsoluteSlotLayouts,
  azIdleLetterFontPx,
  azSlotTopCss,
} from './azLayout'

describe('azLayout', () => {
  it('emits 27 absolute slots covering 0–100%', () => {
    const slots = azAbsoluteSlotLayouts()
    expect(slots).toHaveLength(AZ_SLOT_COUNT)
    expect(slots[0].topPct).toBeCloseTo((0.5 / 27) * 100, 5)
    expect(slots[26].topPct).toBeCloseTo((26.5 / 27) * 100, 5)
    expect(slots.every((s) => s.translateY === '-50%')).toBe(true)
  })

  it('azSlotTopCss matches layout math', () => {
    expect(azSlotTopCss(0)).toBe(`${(0.5 / 27) * 100}%`)
    expect(azSlotTopCss(13)).toBe(`${(13.5 / 27) * 100}%`)
  })

  it('letter font never below floor even on short strips', () => {
    expect(azIdleLetterFontPx(100)).toBe(CK_AZ_LETTER_MIN_PX)
    expect(azIdleLetterFontPx(0)).toBe(CK_AZ_LETTER_MIN_PX)
    // Tall 21:9 strip ~700px → per-slot ~25px → font capped at 14
    expect(azIdleLetterFontPx(700)).toBe(14)
    // Medium: 27*14 = 378 → per ~14 → font 12
    expect(azIdleLetterFontPx(378)).toBeGreaterThanOrEqual(CK_AZ_LETTER_MIN_PX)
  })
})
