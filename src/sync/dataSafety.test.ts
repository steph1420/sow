// v0.29.1 data-safety (t2u/t3u) — written before the fix.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMark, getSettings, listMarks, listStudents, putMark, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { canUndo, pushUndo } from '../lib/undoStack'
import { pullSubjects } from './engine'
import kgaCw from './__fixtures__/kga_eng_cw.csv?raw'
import kgaHw from './__fixtures__/kga_eng_hw.csv?raw'
import kgbHw from './__fixtures__/kgb_eng_hw.csv?raw'

const ALL: Record<string, string> = {
  'KGA Eng CW': kgaCw,
  'KGB Eng CW': kgaCw.replace('"Aaditya Chauhan","FALSE"', '"Aaditya Chauhan","TRUE"'),
  'KGA Eng HW': kgaHw,
  'KGB Eng HW': kgbHw,
}
type Opts = { tabList?: string[] | null; fail?: string[]; tabs?: Record<string, string> }
function workbook(o: Opts = {}) {
  const tabs = o.tabs ?? ALL
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url)
    if (u.pathname.endsWith('/htmlview')) {
      if (!o.tabList) throw new TypeError('CORS')
      return new Response(o.tabList.map((n) => `name: "${n}"`).join('\n'), { status: 200 })
    }
    const name = u.searchParams.get('sheet') ?? ''
    if (o.fail?.includes(name)) return new Response('boom', { status: 500 })
    return new Response(tabs[name] ?? kgaCw, { status: 200 })
  })
}

beforeEach(async () => {
  await resetDbForTests()
  workbook()
  await seedIfEmpty()
  // v0.32.0: workbook URL is blank by default (Q-FIX-4B); these tests pull from a configured sheet
  await putSettings({ sheetUrl: 'https://docs.google.com/spreadsheets/d/TESTSHEET/edit' })
})
afterEach(() => vi.unstubAllGlobals())

async function submitOne() {
  const st = (await getSettings()).engSyncState!.KGA_Eng_HW!
  const m = (await listMarks('KGA_Eng_HW'))[0]!
  await putMark({ ...m, submitted: true, updatedAt: st.lastSyncAt })
  return m
}

describe('v0.29.1 undo cleared after pull', () => {
  it('a successful pull clears undo history', async () => {
    pushUndo('KGA_Eng_CW', { undo: [], redo: [] })
    expect(canUndo('KGA_Eng_CW')).toBe(true)
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect(canUndo('KGA_Eng_CW')).toBe(false)
  })
})

describe('v0.29.1 pull keeps the changed-locally flag', () => {
  it('v0.29.2: a pull itself never marks the device dirty (sheet writes are not local changes)', async () => {
    await putSettings({ syncDirty: false })
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect((await getSettings()).syncDirty).toBe(false)
  })
  it('pull does not clear syncDirty', async () => {
    await pullSubjects(['Eng'])
    await putSettings({ syncDirty: true })
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect((await getSettings()).syncDirty).toBe(true)
  })
})

describe('v0.29.1 Q-FIX-5 source-confirmed purge', () => {
  it('a tab that fails to load is kept with its Submitted ticks (probe mode)', async () => {
    await pullSubjects(['Eng'])
    const m = await submitOne()
    workbook({ fail: ['KGA Eng HW'] })
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect((await listStudents('KGA_Eng_HW')).length).toBeGreaterThan(0)
    expect((await getMark('KGA_Eng_HW', m.roll, m.date))?.submitted).toBe(true)
    expect((await getSettings()).discoveredTabs?.map((t) => t.name)).toContain('KGA Eng HW')
  })
  it('a listed tab that fails to load is kept (tab-list mode)', async () => {
    workbook({ tabList: Object.keys(ALL) })
    await pullSubjects(['Eng'])
    await submitOne()
    workbook({ tabList: Object.keys(ALL), fail: ['KGA Eng HW'] })
    await pullSubjects(['Eng'])
    expect((await listStudents('KGA_Eng_HW')).length).toBeGreaterThan(0)
  })
  it('tab list confirms the tab is gone → class purged but Submitted ticks preserved', async () => {
    workbook({ tabList: Object.keys(ALL) })
    await pullSubjects(['Eng'])
    const m = await submitOne()
    const rest = Object.keys(ALL).filter((n) => n !== 'KGA Eng HW')
    workbook({ tabList: rest })
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect(await listStudents('KGA_Eng_HW')).toHaveLength(0)
    const left = await listMarks('KGA_Eng_HW')
    expect(left.every((x) => x.submitted)).toBe(true)
    expect((await getMark('KGA_Eng_HW', m.roll, m.date))?.submitted).toBe(true)
  })
})
