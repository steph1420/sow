import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMark, getSession, getSettings, listMarks, listStudents, putMark, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { probeSheet, pullSubjects, syncNow } from './engine'
import kgaCw from './__fixtures__/kga_eng_cw.csv?raw'
import kgaHw from './__fixtures__/kga_eng_hw.csv?raw'
import kgbHw from './__fixtures__/kgb_eng_hw.csv?raw'

// Fake workbook: tab list unreachable (CORS-like) → probe mode; missing tabs return default (KGA Eng CW).
const TABS: Record<string, string> = {
  'KGA Eng CW': kgaCw,
  'KGB Eng CW': kgaCw.replace('"Aaditya Chauhan","FALSE"', '"Aaditya Chauhan","TRUE"'),
  'KGA Eng HW': kgaHw,
  'KGB Eng HW': kgbHw,
}

beforeEach(async () => {
  await resetDbForTests()
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url)
    if (u.pathname.endsWith('/htmlview')) throw new TypeError('CORS')
    const name = u.searchParams.get('sheet') ?? ''
    return new Response(TABS[name] ?? kgaCw, { status: 200 })
  })
  await seedIfEmpty()
})
afterEach(() => vi.unstubAllGlobals())

describe('discovery + merge pull', () => {
  it('rejects gviz default-tab fallback for Math/Sci', async () => {
    const r = await probeSheet()
    expect(r.ok).toBe(true)
    const s = await getSettings()
    expect(s.discoveredTabs?.map((t) => t.name)).toEqual(['KGA Eng CW', 'KGB Eng CW', 'KGA Eng HW', 'KGB Eng HW'])
    const math = await pullSubjects(['Math'])
    expect(math.ok).toBe(false)
    expect(math.message).toMatch(/Math not on sheet/)
  })

  it('pulls marks, keeps submitted, writes sessions + sheetSeenAt, drops demo dates', async () => {
    const r = await pullSubjects(['Eng'])
    expect(r.ok).toBe(true)
    expect(await listStudents('KGA_Eng_CW')).toHaveLength(44)
    const kga = await listMarks('KGA_Eng_CW')
    expect(kga.length).toBe(88)
    expect(kga.filter((m) => m.set).length).toBe(32)
    const sess = await getSession('KGA_Eng_CW|current')
    expect(sess).toMatchObject({ date1: '2026-10-28', topic1: 'Q', date2: '2026-11-02' })
    expect((await getSession('KGA_Eng_HW|current'))?.date1).toBe('2026-10-07')
    expect((await listMarks('KGA_Eng_HW')).every((m) => ['2026-10-07', '2026-10-14'].includes(m.date))).toBe(true)
    const st = (await getSettings()).engSyncState?.KGA_Eng_CW
    expect(st?.sheetSeenAt).toBeTruthy()

    // Submitted is app-only → survives the next pull.
    const m = (await getMark('KGA_Eng_CW', 2, '2026-10-28'))!
    await putMark({ ...m, submitted: true, updatedAt: st!.lastSyncAt })
    await pullSubjects(['Eng'])
    expect((await getMark('KGA_Eng_CW', 2, '2026-10-28'))?.submitted).toBe(true)
    expect((await listMarks('KGA_Math_CW')).length).toBe(0) // t158u: demo Math purged (not on sheet)
    await putSettings({})
  })

  it('local set edited after last pull wins over sheet', async () => {
    await pullSubjects(['Eng'])
    const m = (await getMark('KGA_Eng_CW', 2, '2026-10-28'))!
    expect(m.set).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    await putMark({ ...m, set: false, updatedAt: new Date(Date.now() + 1000).toISOString() })
    await pullSubjects(['Eng'])
    expect((await getMark('KGA_Eng_CW', 2, '2026-10-28'))?.set).toBe(false)
  })
})

describe('P0-1 first pull: sheet wins over demo seed', () => {
  it('drops every demo mark (incl. Submitted) on first pull for pulled classes', async () => {
    const before = await listMarks('KGA_Eng_CW')
    expect(before.some((m) => m.submitted)).toBe(true) // demo seed has phantom Submitted
    await pullSubjects(['Eng'])
    for (const k of ['KGA_Eng_CW', 'KGB_Eng_CW', 'KGA_Eng_HW', 'KGB_Eng_HW'] as const) {
      expect((await listMarks(k)).filter((m) => m.submitted)).toHaveLength(0)
    }
    // roll 1 is FALSE on sheet for 28/10 → not set, not submitted
    const r1 = await getMark('KGA_Eng_CW', 1, '2026-10-28')
    expect(r1?.submitted ?? false).toBe(false)
  })
})

describe('P1-2 offline sync keeps last tabs', () => {
  it('network failure does not wipe discovered tabs or flip dirty', async () => {
    await probeSheet()
    const before = (await getSettings()).discoveredTabs
    expect(before?.length).toBe(4)
    await putSettings({ syncDirty: false })
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    const r = await syncNow(['Eng'])
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/offline/i)
    const s = await getSettings()
    expect(s.discoveredTabs).toEqual(before)
    expect(s.syncDirty).toBe(false)
  })
  it('navigator offline short-circuits without fetching', async () => {
    await probeSheet()
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    vi.stubGlobal('navigator', { onLine: false })
    const r = await pullSubjects(['Eng'])
    expect(f).not.toHaveBeenCalled()
    expect(r.message).toMatch(/offline/i)
    expect((await getSettings()).discoveredTabs?.length).toBe(4)
  })
})
