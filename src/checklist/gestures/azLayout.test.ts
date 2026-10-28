import { describe, expect, it } from 'vitest'
import {
  AZ_IDLE_W,
  AZ_LETTER_MIN_PX,
  AZ_LETTERS,
  azSlotTopPercent,
  firstLetterOfName,
  jumpLetterToRoll,
  letterAtY,
  letterEmpty,
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

  it('letterAtY respects filtered letters (hide-dimmed)', () => {
    const letters = ['*', 'A', 'B', 'D'] as const
    expect(letterAtY(0, 0, 400, letters)).toBe('*')
    expect(letterAtY(250, 0, 400, letters)).toBe('B')
  })

  it('jumpLetterToRoll latches next populated on empty letter', () => {
    const rows = [
      { roll: 1, name: 'Aaditya' },
      { roll: 8, name: 'Dhruv' },
      { roll: 11, name: 'Farhan' },
    ]
    expect(jumpLetterToRoll('A', rows)).toBe(1)
    expect(jumpLetterToRoll('C', rows)).toBe(8) // empty C → D
    expect(jumpLetterToRoll('F', rows)).toBe(11)
    expect(jumpLetterToRoll('*', rows)).toBe(1)
    expect(letterEmpty('C', rows.map((r) => r.name))).toBe(true)
    expect(letterEmpty('A', rows.map((r) => r.name))).toBe(false)
  })
})
