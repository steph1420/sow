import { describe, expect, it } from 'vitest'
import { clashFor, countMarks, moveMarks, dropMarks, pairAfterMove, pairAfterDelete, readDateCols } from './sessionEdit'
import { turn } from './dial'

const marks = {
  '1|2026-11-02': { set: true, submitted: false },
  '2|2026-11-02': { set: true, submitted: true },
  '3|2026-11-02': { set: false, submitted: false },
  '1|2026-10-30': { set: true, submitted: false },
}
describe('v0.43 session edit', () => {
  it('moveMarks re-keys only the moved date', () => {
    const out = moveMarks(marks, '2026-11-02', '2026-11-03')
    expect(out['1|2026-11-03']).toEqual({ set: true, submitted: false })
    expect(out['2|2026-11-03']).toEqual({ set: true, submitted: true })
    expect(out['1|2026-11-02']).toBeUndefined()
    expect(out['1|2026-10-30']).toEqual({ set: true, submitted: false })
  })
  it('countMarks counts real ticks (set or submitted) on a date', () => {
    expect(countMarks(marks, '2026-11-02')).toBe(2)
    expect(countMarks(marks, '2026-10-30')).toBe(1)
    expect(countMarks(marks, '2026-10-01')).toBe(0)
  })
  it('dropMarks removes a date and returns the snapshot', () => {
    const { next, removed } = dropMarks(marks, '2026-11-02')
    expect(Object.keys(removed).length).toBe(3)
    expect(next['1|2026-10-30']).toBeTruthy()
    expect(next['1|2026-11-02']).toBeUndefined()
  })
  it('clash blocks moving onto another existing session', () => {
    const s = new Map([['2026-11-02', 'A'], ['2026-11-03', 'B']])
    expect(clashFor(s, '2026-11-02', '2026-11-03')).toBe('B')
    expect(clashFor(s, '2026-11-02', '2026-11-02')).toBeNull()
    expect(clashFor(s, null, '2026-11-04')).toBeNull()
    expect(clashFor(s, null, '2026-11-02')).toBe('A')
  })
  it('pair follows a moved date and stays oldest first', () => {
    expect(pairAfterMove(['2026-10-30', '2026-11-02'], '2026-11-02', '2026-10-28')).toEqual(['2026-10-28', '2026-10-30'])
    expect(pairAfterMove(['2026-10-30', '2026-11-02'], '2026-10-01', '2026-10-02')).toEqual(['2026-10-30', '2026-11-02'])
  })
  it('pair drops a deleted date', () => {
    expect(pairAfterDelete(['2026-10-30', '2026-11-02'], '2026-11-02')).toEqual(['2026-10-30', '2026-10-30'])
    expect(pairAfterDelete(['2026-11-02', '2026-11-02'], '2026-11-02')).toBeNull()
  })
  it('1|2 date view is a per-device pref: new device = 1, existing device without a choice = 2', () => {
    expect(readDateCols(null, false)).toBe(1)
    expect(readDateCols(null, true)).toBe(2)
    expect(readDateCols('2', false)).toBe(2)
    expect(readDateCols('1')).toBe(1)
    expect(readDateCols('junk')).toBe(2)
  })
})
describe('v0.43 Year bug (Q-V43 #8)', () => {
  it('turning Month past Dec carries the year forward', () => {
    expect(turn({ y: 2025, m: 12, d: 30 }, 'month', 1)).toEqual({ y: 2026, m: 1, d: 30 })
  })
  it('turning Month back past Jan carries the year back', () => {
    expect(turn({ y: 2026, m: 1, d: 5 }, 'month', -1)).toEqual({ y: 2025, m: 12, d: 5 })
  })
})
