// v0.29.2 Q-FIX-2 A (t3u "2. A") per-tick newer-wins merge + one-time migration — written first.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMark, getSettings, listMarks, putMark, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { marksToMap, persistClassMarks } from '../data/persistWorkspace'
import { listStudents } from '../data/api'
import { pullSubjects, syncNow } from './engine'
import kgaCw from './__fixtures__/kga_eng_cw.csv?raw'
import kgaHw from './__fixtures__/kga_eng_hw.csv?raw'
import kgbHw from './__fixtures__/kgb_eng_hw.csv?raw'

let TABS: Record<string, string>
const base = () => ({
  'KGA Eng CW': kgaCw,
  'KGB Eng CW': kgaCw.replace('"Aaditya Chauhan","FALSE"', '"Aaditya Chauhan","TRUE"'),
  'KGA Eng HW': kgaHw,
  'KGB Eng HW': kgbHw,
})
beforeEach(async () => {
  await resetDbForTests()
  TABS = base()
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url)
    if (u.pathname.endsWith('/htmlview')) throw new TypeError('CORS')
    return new Response(TABS[u.searchParams.get('sheet') ?? ''] ?? kgaCw, { status: 200 })
  })
  await seedIfEmpty()
  // v0.32.0: workbook URL is blank by default (Q-FIX-4B); these tests pull from a configured sheet
  await putSettings({ sheetUrl: 'https://docs.google.com/spreadsheets/d/TESTSHEET/edit' })
})
afterEach(() => vi.unstubAllGlobals())

// KGA Eng CW fixture: roll 1 "FALSE","FALSE"; roll 2 "TRUE","TRUE" (28/10, 2/11)
const D1 = '2026-10-28'
const sheetSet = (roll: number, name: string, v: string) => {
  TABS['KGA Eng CW'] = TABS['KGA Eng CW'].replace(new RegExp(`"${roll}","${name}","(TRUE|FALSE)"`), `"${roll}","${name}","${v}"`)
}
async function localTick(roll: number, date: string, set: boolean) {
  const marks = marksToMap(await listMarks('KGA_Eng_CW'))
  marks[`${roll}|${date}`] = { ...(marks[`${roll}|${date}`] ?? { submitted: false }), set }
  const roster = (await listStudents('KGA_Eng_CW')).map((s) => ({ roll: s.roll, name: s.name, left: false }))
  await new Promise((r) => setTimeout(r, 5))
  await persistClassMarks('KGA_Eng_CW', marks, roster, [{ date: D1, topic: 'Q' }, { date: '2026-11-02', topic: 'Q' }])
}

describe('per-tick persist', () => {
  it('a local tick stamps only that tick', async () => {
    await pullSubjects(['Eng'])
    const before = await listMarks('KGA_Eng_CW')
    await localTick(1, D1, true)
    const after = await listMarks('KGA_Eng_CW')
    const changed = after.filter((m) => before.find((b) => b.markId === m.markId)?.updatedAt !== m.updatedAt)
    expect(changed.map((m) => m.markId)).toEqual([before.find((m) => m.roll === 1 && m.date === D1)!.markId])
  })
})

describe('per-tick newer-wins merge', () => {
  it('local tick on roll 1 + sheet edit on roll 2 → both survive', async () => {
    await pullSubjects(['Eng'])
    await localTick(1, D1, true)
    sheetSet(2, 'Aayat Asif', 'FALSE')
    await pullSubjects(['Eng'])
    expect((await getMark('KGA_Eng_CW', 1, D1))?.set).toBe(true) // local kept
    expect((await getMark('KGA_Eng_CW', 2, D1))?.set).toBe(false) // sheet edit wins (was overridden in v0.29.1)
  })
  it('after the local tick reaches the sheet, a later sheet change wins', async () => {
    await pullSubjects(['Eng'])
    await localTick(1, D1, true)
    sheetSet(1, 'Aaditya Chauhan', 'TRUE')
    await pullSubjects(['Eng'])
    sheetSet(1, 'Aaditya Chauhan', 'FALSE')
    await pullSubjects(['Eng'])
    expect((await getMark('KGA_Eng_CW', 1, D1))?.set).toBe(false)
  })
})

describe('one-time migration of v0.29.1 class-wide stamps (no data loss)', () => {
  it('legacy local edit is kept; untouched ticks then follow the sheet', async () => {
    await pullSubjects(['Eng'])
    const st = (await getSettings()).engSyncState!.KGA_Eng_CW!
    // Simulate v0.29.1 data: no sheetSet baseline; roll 1 edited locally after the pull (class-wide stamp),
    // roll 2 untouched since the pull.
    const later = new Date(Date.parse(st.lastSyncAt) + 60_000).toISOString()
    for (const m of await listMarks('KGA_Eng_CW')) {
      const { sheetSet: _drop, ...legacy } = m as typeof m & { sheetSet?: boolean }
      const edited = m.roll === 1 && m.date === D1
      await putMark({ ...legacy, set: edited ? true : m.set, updatedAt: edited ? later : st.lastSyncAt })
    }
    await putSettings({ mergeV2At: undefined })
    sheetSet(2, 'Aayat Asif', 'FALSE')
    await pullSubjects(['Eng'])
    expect((await getMark('KGA_Eng_CW', 1, D1))?.set).toBe(true) // legacy local edit kept
    expect((await getMark('KGA_Eng_CW', 2, D1))?.set).toBe(false) // untouched tick follows the sheet
    expect((await getSettings()).mergeV2At).toBeTruthy()
  })
})

describe('Q-FIX-7 honest push status', () => {
  it('no bridge → "Saved on this device · push not set up", never Pushed', async () => {
    const r = await syncNow(['Eng'])
    expect(r.message).toContain('Saved on this device · push not set up')
    expect(r.message).not.toMatch(/pushed/i)
    expect(r.pushed).toBe(false)
  })
  it('bridge URL set but push not built → still not Pushed, dirty kept', async () => {
    await pullSubjects(['Eng'])
    await putSettings({ syncUrl: 'https://script.google.com/macros/s/x/exec', syncDirty: true })
    const r = await syncNow(['Eng'])
    expect(r.pushed).toBe(false)
    expect(r.message).not.toMatch(/pushed/i)
    expect(r.message).toContain('Saved on this device · push not set up')
    expect((await getSettings()).syncDirty).toBe(true)
  })
})
