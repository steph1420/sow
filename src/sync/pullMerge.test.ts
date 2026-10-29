import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMark, getSession, getSettings, listMarks, listStudents, putMark, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { probeSheet, pullSubjects } from './engine'
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
    expect((await listMarks('KGA_Math_CW')).length).toBeGreaterThan(0) // demo Math untouched
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
