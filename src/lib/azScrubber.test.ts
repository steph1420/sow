import { describe, expect, it } from 'vitest'
import {
  AZ_LETTERS,
  AZ_SLOT_COUNT,
  letterFromSlot,
  presentLettersFromNames,
  slotFromY,
} from './azScrubber'

describe('azScrubber', () => {
  it('maps Y to All then A–Z across the strip height', () => {
    const top = 100
    const height = 270 // 10px per slot
    expect(letterFromSlot(slotFromY(105, top, height))).toBe(null) // All
    expect(letterFromSlot(slotFromY(115, top, height))).toBe('A')
    expect(letterFromSlot(slotFromY(125, top, height))).toBe('B')
    expect(letterFromSlot(slotFromY(365, top, height))).toBe('Z')
  })

  it('clamps outside the strip', () => {
    expect(slotFromY(0, 100, 270)).toBe(0)
    expect(slotFromY(9999, 100, 270)).toBe(AZ_SLOT_COUNT - 1)
    expect(letterFromSlot(AZ_SLOT_COUNT - 1)).toBe('Z')
  })

  it('covers all 26 letters', () => {
    expect(AZ_LETTERS).toHaveLength(26)
    expect(letterFromSlot(0)).toBe(null)
    expect(letterFromSlot(1)).toBe('A')
    expect(letterFromSlot(26)).toBe('Z')
  })

  it('builds present-letter set from names', () => {
    const set = presentLettersFromNames(['Ada', 'ben', '  Zara', '123', ''])
    expect([...set].sort()).toEqual(['A', 'B', 'Z'])
  })
})
