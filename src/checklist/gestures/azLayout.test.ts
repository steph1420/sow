import { describe, expect, it } from 'vitest'
import {
  AZ_IDLE_W,
  AZ_LETTER_MIN_PX,
  AZ_LETTERS,
  azSlotTopPercent,
  firstLetterOfName,
  letterAtY,
  presentLetters,
} from './azLayout'

describe('azLayout', () => {
  it('locks idle width and letter floor', () => {
    expect(AZ_IDLE_W).toBe(42)
    expect(AZ_LETTER_MIN_PX).toBeGreaterThanOrEqual(11)
    expect(AZ_LETTERS).toHaveLength(27)
  })

  it('absolute % slots are monotonic', () => {
    const tops = AZ_LETTERS.map((_, i) => azSlotTopPercent(i))
    for (let i = 1; i < tops.length; i++) expect(tops[i]!).toBeGreaterThan(tops[i - 1]!)
  })

  it('present / first letter', () => {
    expect(firstLetterOfName('meera')).toBe('M')
    const p = presentLetters(['Aaditya', 'Meera', 'Zoya'])
    expect(p.has('A')).toBe(true)
    expect(p.has('M')).toBe(true)
    expect(p.has('B')).toBe(false)
  })

  it('letterAtY maps strip', () => {
    expect(letterAtY(0, 0, 270)).toBe('*')
    expect(letterAtY(135, 0, 270)).toBe('M')
  })
})
