import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMark, getSettings, listRosterMeta, listStudents, putMark, putSettings, setLeft } from '../data/api'
import { resetDbForTests } from '../data/db'
import { seedIfEmpty } from '../data/seed'
import { buildPushPayload, stateFromCsv, stateToApp, type BridgeState } from './bridge'
import { syncNow } from './engine'

const STATE: BridgeState = {
  ok: true,
  schema: 1,
  subjects: [
    { subjectKey: 'KGA_Eng_CW', classKey: 'KGA', subject: 'Eng', kind: 'CW', active: true, order: 1 },
    { subjectKey: 'KGA_Eng_HW', classKey: 'KGA', subject: 'Eng', kind: 'HW', active: true, order: 2 },
    { subjectKey: 'KGC_Art_CW', classKey: 'KGC', subject: 'Art', kind: 'CW', active: true, order: 3 },
  ],
  roster: [
    { classKey: 'KGA', roll: 1, name: 'Demo One', status: 'Active', updatedAt: '2026-10-27T07:00:00.000Z' },
    { classKey: 'KGA', roll: 2, name: 'Demo Two', status: 'Left', updatedAt: '2026-10-27T07:00:00.000Z' },
  ],
  sessions: [
    { sessionId: 'KGA_Eng_CW|2026-10-28', subjectKey: 'KGA_Eng_CW', classKey: 'KGA', date: '2026-10-28', topic: 'Q', status: 'Open', updatedAt: '' },
    { sessionId: 'KGA_Eng_CW|2026-11-02', subjectKey: 'KGA_Eng_CW', classKey: 'KGA', date: '2026-11-02', topic: 'Q', status: 'Open', updatedAt: '' },
  ],
  ticks: [
    { tickId: 'KGA_Eng_CW|2026-10-28|1', sessionId: 'KGA_Eng_CW|2026-10-28', subjectKey: 'KGA_Eng_CW', classKey: 'KGA', roll: 1, set: true, updatedAt: '2026-10-28T05:00:00.000Z' },
    { tickId: 'KGA_Eng_CW|2026-11-02|1', sessionId: 'KGA_Eng_CW|2026-11-02', subjectKey: 'KGA_Eng_CW', classKey: 'KGA', roll: 1, set: false, updatedAt: '2026-10-28T05:00:00.000Z' },
  ],
}

describe('stateToApp (pure)', () => {
  it('maps subjects → classKeys, roster per section → every subject of that class, Left per section, skips unknown subjects', () => {
    const a = stateToApp(STATE)
    expect(a.tabs.map((t) => t.classKey)).toEqual(['KGA_Eng_CW', 'KGA_Eng_HW'])
    expect(a.skipped).toEqual(['KGC_Art_CW'])
    expect(a.students.filter((s) => s.classKey === 'KGA_Eng_HW').map((s) => s.roll)).toEqual([1, 2])
    expect(a.left.filter((l) => l.left).map((l) => l.classKey).sort()).toEqual(['KGA_Eng_CW', 'KGA_Eng_HW'])
    expect(a.marks.map((m) => [m.markId, m.set])).toEqual([['KGA_Eng_CW|1|2026-10-28', true], ['KGA_Eng_CW|1|2026-11-02', false]])
    expect(a.sessions.find((s) => s.classKey === 'KGA_Eng_CW')).toMatchObject({ date1: '2026-11-02', date2: '2026-10-28' })
  })

  it('gviz fallback parses the new tabs (en_IN dd/mm/yyyy dates) into the same state', () => {
    const s = stateFromCsv({
      Subjects: [['subjectKey', 'classKey', 'subject', 'kind', 'active'], ['KGA_Eng_CW', 'KGA', 'Eng', 'CW', 'TRUE']],
      Roster: [['classKey', 'roll', 'name', 'status', 'leftOn', 'note', 'updatedAt'], ['KGA', '1', 'Demo One', 'Active', '', '', '2026-10-27T07:00:00.000Z']],
      Sessions: [['sessionId', 'subjectKey', 'classKey', 'date', 'topic'], ['KGA_Eng_CW|2026-10-28', 'KGA_Eng_CW', 'KGA', '28/10/2026', 'Q']],
      Ticks: [['tickId', 'sessionId', 'subjectKey', 'classKey', 'roll', 'set', 'updatedAt'], ['KGA_Eng_CW|2026-10-28|1', 'KGA_Eng_CW|2026-10-28', 'KGA_Eng_CW', 'KGA', '1', 'TRUE', '2026-10-28T05:00:00.000Z']],
    })
    expect(s.sessions[0]!.date).toBe('2026-10-28')
    expect(s.ticks[0]!.set).toBe(true)
    expect(s.roster[0]!.roll).toBe(1)
  })
})

describe('buildPushPayload (pure)', () => {
  it('sends only marks/Left changed since the last bridge sync; Left goes per section; no Submitted', () => {
    const p = buildPushPayload(
      [
        { markId: 'KGA_Eng_CW|1|2026-10-28', classKey: 'KGA_Eng_CW', roll: 1, name: '', date: '2026-10-28', topic: 'Q', set: true, submitted: true, updatedAt: '2026-10-29T10:00:00.000Z' },
        { markId: 'KGA_Eng_CW|2|2026-10-28', classKey: 'KGA_Eng_CW', roll: 2, name: '', date: '2026-10-28', topic: 'Q', set: true, submitted: false, updatedAt: '2026-10-01T10:00:00.000Z' },
      ],
      [
        { id: 'KGA_Eng_CW|2', classKey: 'KGA_Eng_CW', roll: 2, name: '', left: true, updatedAt: '2026-10-29T09:00:00.000Z' },
        { id: 'KGA_Eng_HW|2', classKey: 'KGA_Eng_HW', roll: 2, name: '', left: true, updatedAt: '2026-10-29T09:30:00.000Z' },
      ],
      '2026-10-20T00:00:00.000Z',
    )
    expect(p.ticks).toEqual([{ subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Q', roll: 1, set: true, updatedAt: '2026-10-29T10:00:00.000Z' }])
    expect(p.roster).toEqual([{ classKey: 'KGA', roll: 2, status: 'Left', updatedAt: '2026-10-29T09:30:00.000Z' }])
  })
})

describe('syncNow via bridge', () => {
  let posts: any[] = []
  let fail = false
  beforeEach(async () => {
    await resetDbForTests()
    posts = []
    fail = false
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (String(url).startsWith('https://script.google.com/')) {
        if (fail) throw new TypeError('Failed to fetch')
        const body = JSON.parse(String(init?.body))
        posts.push({ body, headers: init?.headers })
        if (body.token !== 'TKN') return new Response(JSON.stringify({ ok: false, error: 'bad token' }))
        const res = body.action === 'push' ? { ok: true, applied: body.ticks?.length ?? 0, ignored: 0, rejected: [], state: STATE } : STATE
        return new Response(JSON.stringify(res))
      }
      throw new TypeError('gviz offline in this test')
    })
    await seedIfEmpty()
    await putSettings({ syncUrl: 'https://script.google.com/macros/s/X/exec', bridgeToken: 'TKN' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('pushes dirty ticks (text/plain, token), then applies sheet state; reports Pushed honestly', async () => {
    await syncNow(['Eng']) // first sync: pull baseline
    await putMark({ classKey: 'KGA_Eng_CW', roll: 1, name: 'Demo One', date: '2026-11-02', topic: 'Q', set: true, submitted: false })
    const r = await syncNow(['Eng'])
    const push = posts.find((p) => p.body.action === 'push' && p.body.ticks?.length)
    expect(push.headers['Content-Type']).toBe('text/plain;charset=utf-8')
    expect(push.body.ticks[0]).toMatchObject({ subjectKey: 'KGA_Eng_CW', date: '2026-11-02', roll: 1, set: true })
    expect(r.pushed).toBe(true)
    expect(r.message).toMatch(/Pushed 1/)
    expect((await getSettings()).syncDirty).toBeFalsy()
  })

  it('local tick newer than the sheet tick survives the pull (newer wins per tick)', async () => {
    await syncNow(['Eng'])
    await putMark({ classKey: 'KGA_Eng_CW', roll: 1, name: 'Demo One', date: '2026-11-02', topic: 'Q', set: true, submitted: false })
    await syncNow(['Eng'])
    expect((await getMark('KGA_Eng_CW', 1, '2026-11-02'))?.set).toBe(true)
  })

  it('applies roster + Left from the sheet and purges a class only when Subjects confirms it gone', async () => {
    await syncNow(['Eng'])
    expect((await listStudents('KGA_Eng_HW')).length).toBe(2)
    expect((await listRosterMeta('KGA_Eng_HW')).find((m) => m.roll === 2)?.left).toBe(true)
    expect((await listStudents('KGB_Eng_CW')).length).toBe(0) // demo class not on the sheet → purged (confirmed by Subjects)
  })

  it('pushes a Left change made on the phone', async () => {
    await syncNow(['Eng'])
    await setLeft('KGA_Eng_CW', 1, true, 'Demo One')
    await syncNow(['Eng'])
    const push = posts.filter((p) => p.body.action === 'push').pop()
    expect(push.body.roster).toEqual([expect.objectContaining({ classKey: 'KGA', roll: 1, status: 'Left' })])
  })

  it('bad token → honest error, nothing marked pushed', async () => {
    await putSettings({ bridgeToken: 'WRONG' })
    const r = await syncNow(['Eng'])
    expect(r.pushed).toBe(false)
    expect(r.message).toMatch(/token/i)
  })

  it('bridge unreachable → falls back to gviz read, marks stay on device and stay dirty', async () => {
    await putMark({ classKey: 'KGA_Eng_CW', roll: 1, name: 'x', date: '2026-11-02', topic: 'Q', set: true, submitted: false })
    fail = true
    const r = await syncNow(['Eng'])
    expect(r.pushed).toBe(false)
    expect((await getSettings()).syncDirty).toBe(true)
  })
})
