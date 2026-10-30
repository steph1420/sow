import { describe, expect, it } from 'vitest'
import { describeUndo } from './undoLabel'
const name = (r: number) => ({ 1: 'Aarav Demo', 2: 'Bela Sample' } as Record<number, string>)[r] ?? `Roll ${r}`
const dn = (d: string) => ({ '2026-10-28': '28/10', '2026-11-02': '2/11' } as Record<string, string>)[d] ?? d
const snap = (roll: number, date: string, set: boolean, submitted = false) => ({ roll, date, set, submitted })

describe('v0.41.0 undo / redo toast text (t101u)', () => {
  it('single tick names pupil and date', () => {
    const e = { undo: [snap(1, '2026-10-28', false)], redo: [snap(1, '2026-10-28', true)] }
    expect(describeUndo(e, 'undo', { name, dayNum: dn, rosterSize: 44 })).toBe('Undid tick · Aarav Demo · 28/10')
    expect(describeUndo(e, 'redo', { name, dayNum: dn, rosterSize: 44 })).toBe('Redid tick · Aarav Demo · 28/10')
  })
  it('untick', () => {
    const e = { undo: [snap(2, '2026-11-02', true)], redo: [snap(2, '2026-11-02', false)] }
    expect(describeUndo(e, 'undo', { name, dayNum: dn, rosterSize: 44 })).toBe('Undid untick · Bela Sample · 2/11')
  })
  it('tick all on a column', () => {
    const rolls = Array.from({ length: 44 }, (_, i) => i + 1)
    const e = { undo: rolls.map((r) => snap(r, '2026-11-02', false)), redo: rolls.map((r) => snap(r, '2026-11-02', true)) }
    expect(describeUndo(e, 'redo', { name, dayNum: dn, rosterSize: 44 })).toBe('Redid tick all · 2/11 · 44 pupils')
  })
  it('several ticks, one or both dates; submitted mode says submitted', () => {
    const e = { undo: [snap(1, '2026-10-28', false), snap(2, '2026-10-28', false)], redo: [snap(1, '2026-10-28', true), snap(2, '2026-10-28', true)] }
    expect(describeUndo(e, 'undo', { name, dayNum: dn, rosterSize: 44 })).toBe('Undid 2 ticks · 28/10')
    const b = { undo: [snap(1, '2026-10-28', false), snap(1, '2026-11-02', false)], redo: [snap(1, '2026-10-28', true), snap(1, '2026-11-02', true)] }
    expect(describeUndo(b, 'undo', { name, dayNum: dn, rosterSize: 44 })).toBe('Undid tick · Aarav Demo · 28/10 + 2/11')
    const s = { undo: [snap(1, '2026-10-28', false, false)], redo: [snap(1, '2026-10-28', false, true)] }
    expect(describeUndo(s, 'undo', { name, dayNum: dn, rosterSize: 44 })).toBe('Undid submitted · Aarav Demo · 28/10')
  })
})
