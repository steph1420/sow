import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listMarks, listStudents, putRosterMeta, putStudent } from './api'
import { resetDbForTests } from './db'
import { loadWorkspaceFromIdb, seedDemoWorkspaceToIdb } from './persistWorkspace'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await resetDbForTests()
})

describe('persistWorkspace', () => {
  it('seeds demo and reloads marks map', async () => {
    await seedDemoWorkspaceToIdb()
    const loaded = await loadWorkspaceFromIdb()
    expect(loaded.hasStudents).toBe(true)
    expect(loaded.rosters.KGA_Eng_CW.length).toBe(42)
    expect(Object.keys(loaded.marksByClass.KGA_Eng_CW).length).toBeGreaterThan(0)
    expect((await listStudents('KGB_Eng_CW')).length).toBe(44)
    expect((await listMarks('KGA_Eng_CW')).length).toBeGreaterThan(0)
  })

  it('seedIfEmpty is idempotent', async () => {
    expect((await seedIfEmpty()).seeded).toBe(true)
    expect((await seedIfEmpty()).seeded).toBe(false)
  })
})

import { persistClassMarks } from './persistWorkspace'
describe('persistClassMarks (v0.44.1)', () => {
  it('a new date stores only real marks, not an unticked row per pupil', async () => {
    const roster = [1, 2, 3, 4].map((roll) => ({ roll, name: `P${roll}` })) as never
    await persistClassMarks('KGB_Eng_CW', { '1|2026-12-31': { set: true, submitted: false }, '2|2026-12-31': { set: false, submitted: false } }, roster, [{ date: '2026-12-31', topic: 'ZZ' }])
    const m = (await listMarks('KGB_Eng_CW')).filter((x) => x.date === '2026-12-31')
    expect(m.map((x) => x.roll)).toEqual([1])
  })
  it('clearing an existing tick is still stored (pushes as a clear)', async () => {
    const roster = [1].map((roll) => ({ roll, name: 'P' })) as never
    await persistClassMarks('KGB_Eng_CW', { '1|2026-12-31': { set: true, submitted: false } }, roster, [])
    await persistClassMarks('KGB_Eng_CW', { '1|2026-12-31': { set: false, submitted: false } }, roster, [])
    const m = (await listMarks('KGB_Eng_CW')).filter((x) => x.date === '2026-12-31')
    expect(m.length === 1 && m[0]!.set === false).toBe(true)
  })

  // v0.46.0 (t5u "Left students should be synced properly"): Left read back from IDB (was always false — BUGS persistWorkspace.ts)
  it('reads Left back from rosterMeta (sheet → phone and after reload)', async () => {
    await putStudent({ id: 'KGB_Eng_CW|1', classKey: 'KGB_Eng_CW', roll: 1, name: 'Demo One' })
    await putStudent({ id: 'KGB_Eng_CW|2', classKey: 'KGB_Eng_CW', roll: 2, name: 'Demo Two' })
    await putRosterMeta({ classKey: 'KGB_Eng_CW', roll: 2, name: 'Demo Two', left: true, updatedAt: '2026-10-30T00:00:00.000Z' })
    const loaded = await loadWorkspaceFromIdb()
    expect(loaded.rosters.KGB_Eng_CW).toEqual([{ roll: 1, name: 'Demo One', left: false }, { roll: 2, name: 'Demo Two', left: true }])
  })
})
