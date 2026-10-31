import { beforeEach, describe, expect, it } from 'vitest'
import { canUndo, clearUndoStacks, popRedo, popUndo, pushUndo, purgeDate, remapDate, takeEntry, type UndoEntry } from './undoStack'
import { describeUndo } from './undoLabel'

const tick = (date: string, roll = 1): UndoEntry => ({ undo: [{ roll, date, set: false, submitted: false }], redo: [{ roll, date, set: true, submitted: false }] })
const ctx = { name: () => 'x', dayNum: (d: string) => d, rosterSize: 40 }
beforeEach(() => clearUndoStacks())

describe('v0.44.2 session undo (t52u)', () => {
  it('purgeDate drops tick entries of a deleted date, keeps others', () => {
    pushUndo('K', tick('2026-11-02')); pushUndo('K', tick('2026-11-03'))
    pushUndo('K', { undo: [...tick('2026-11-02', 2).undo, ...tick('2026-11-03', 2).undo], redo: [...tick('2026-11-02', 2).redo, ...tick('2026-11-03', 2).redo] })
    purgeDate('K', '2026-11-02')
    const a = popUndo('K')!, b = popUndo('K')!
    expect(a.undo.map((s) => s.date)).toEqual(['2026-11-03'])
    expect(b.undo.map((s) => s.date)).toEqual(['2026-11-03'])
    expect(canUndo('K')).toBe(false)
  })
  it('remapDate moves tick entries with a moved date (both stacks)', () => {
    pushUndo('K', tick('2026-11-02'))
    remapDate('K', '2026-11-02', '2026-11-09')
    expect(popUndo('K')!.redo[0]!.date).toBe('2026-11-09')
    remapDate('K', '2026-11-09', '2026-11-02')
    expect(popRedo('K')!.redo[0]!.date).toBe('2026-11-02')
  })
  it('a session entry is ONE step and names itself', () => {
    const runs: string[] = []
    pushUndo('K', tick('2026-11-02'))
    pushUndo('K', { undo: [], redo: [], session: { label: { undo: 'Restored Mon 2/11 · 24 ticks', redo: 'Deleted Mon 2/11 again' }, run: (k) => runs.push(k) } })
    const e = popUndo('K')!
    expect(e.session).toBeTruthy()
    expect(describeUndo(e, 'undo', ctx)).toBe('Restored Mon 2/11 · 24 ticks')
    expect(describeUndo(e, 'redo', ctx)).toBe('Deleted Mon 2/11 again')
  })
  it('takeEntry moves a specific entry to redo (toast Undo button)', () => {
    const s: UndoEntry = { undo: [], redo: [], session: { label: { undo: 'u', redo: 'r' }, run: () => {} } }
    pushUndo('K', s); pushUndo('K', tick('2026-11-03'))
    expect(takeEntry('K', s)).toBe(true)
    expect(popRedo('K')).toBe(s)
    expect(takeEntry('K', tick('x'))).toBe(false)
  })
})

describe('v0.44.2 delete step survives Sync', () => {
  it('clearUndoStacks keeps a keepOnSync session step but drops tick steps and redo', async () => {
    const u = await import('./undoStack')
    u.clearUndoStacks()
    u.pushUndo('K', { undo: [{ roll: 1, date: '2026-01-01', set: false, submitted: false }], redo: [] })
    u.pushUndo('K', { undo: [], redo: [], session: { label: { undo: 'a', redo: 'b' }, run: () => {}, keepOnSync: true } })
    u.clearUndoStacks()
    expect(u.canUndo('K')).toBe(true)
    expect(u.popUndo('K')?.session?.label.undo).toBe('a')
    expect(u.canUndo('K')).toBe(false)
  })
})
