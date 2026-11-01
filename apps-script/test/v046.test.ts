import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockRange, MockSpreadsheet, makeGlobals } from './mockSheets'

// v0.46.0 (Steve t4u/t5u/t7u): changed-rows-only push, subManual, clock-safe newer-wins.
const NEW = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
const OLD = readFileSync(new URL('./__fixtures__/Code.v0.44.0.js', import.meta.url), 'utf8')
const SUBJ = ['KGA_Eng_CW', 'KGA_Eng_HW', 'KGB_Eng_CW']

function env(code: string, seed = true) {
  const ss = new MockSpreadsheet('1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI')
  const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, isNaN })
  vm.runInContext(code, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  c.buildTabs_(ss)
  if (seed) {
    ss.getSheetByName('Subjects')!.getRange(2, 1, 3, 7).setValues(SUBJ.map((k, i) => [k, k.slice(0, 3), 'Eng', k.slice(-2), true, i + 1, '2026-10-01']))
    const roster: unknown[][] = []
    for (const sec of ['KGA', 'KGB']) for (let r = 1; r <= 20; r++) roster.push([sec, r, `Demo ${sec} ${r}`, 'Active', '', '', '2026-10-01T00:00:00.000Z'])
    ss.getSheetByName('Roster')!.getRange(2, 1, roster.length, 7).setValues(roster)
    const ses: unknown[][] = [], tic: unknown[][] = []
    for (const k of SUBJ) for (const d of ['2026-10-20', '2026-10-21']) {
      const sid = `${k}|${d}`
      ses.push([sid, k, k.slice(0, 3), new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8)), 'Demo topic', 'Open', '2026-10-20T00:00:00.000Z', '2026-10-20T00:00:00.000Z'])
      for (let r = 1; r <= 20; r++) tic.push([`${sid}|${r}`, sid, k, k.slice(0, 3), r, r % 3 === 0, '2026-10-20T05:00:00.000Z', 'app'])
    }
    ss.getSheetByName('Sessions')!.getRange(2, 1, ses.length, 8).setValues(ses)
    ss.getSheetByName('Ticks')!.getRange(2, 1, tic.length, 8).setValues(tic)
  }
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify({ token, ...body }) } }).text)
  return { ss, c, post }
}
const cols = (ss: MockSpreadsheet, tab: string, n: number) => ss.getSheetByName(tab)!.rows().map((r) => r.slice(0, n).map((v) => (v instanceof Date ? v.toISOString() : v)))
const tick = (k: string, d: string, roll: number, set: boolean, at: string, extra: object = {}) => ({ subjectKey: k, date: d, topic: 'Demo topic', roll, set, updatedAt: at, ...extra })

const PUSHES = [
  { ticks: [tick('KGA_Eng_CW', '2026-10-20', 4, true, '2026-10-22T01:00:00.000Z'), tick('KGA_Eng_CW', '2026-10-20', 5, false, '2026-10-19T01:00:00.000Z')] },
  { ticks: [tick('KGB_Eng_CW', '2026-10-25', 2, true, '2026-10-25T01:00:00.000Z'), tick('KGB_Eng_CW', '2026-10-25', 3, true, '2026-10-25T01:00:00.000Z')] },
  { ticks: [tick('KGA_Eng_HW', '2026-10-21', 9, true, '2026-10-26T01:00:00.000Z')], roster: [{ classKey: 'KGA', roll: 7, status: 'Left', updatedAt: '2026-10-26T02:00:00.000Z' }] },
  { sessions: [{ subjectKey: 'KGA_Eng_CW', date: '2026-10-20', topic: 'New topic', updatedAt: '2026-10-27T01:00:00.000Z' }], ticks: [tick('KGA_Eng_CW', '2026-10-28', 1, true, '2026-10-28T01:00:00.000Z')] },
  { structs: [{ kind: 'rename', subjectKey: 'KGB_Eng_CW', from: '2026-10-25', to: '2026-10-26', at: '2026-10-29T00:00:00.000Z' }], ticks: [tick('KGB_Eng_CW', '2026-10-26', 4, true, '2026-10-29T01:00:00.000Z')] },
  { ticks: [tick('KGA_Eng_CW', '2026-10-20', 4, true, '2026-10-22T01:00:00.000Z')] }, // no-op repeat
  { structs: [{ kind: 'delete', subjectKey: 'KGA_Eng_HW', date: '2026-10-20', at: '2026-10-30T00:00:00.000Z' }] },
]

describe('v0.46.0 bridge', () => {
  it('reports version 0.46.0 and ping carries the sheet id', () => {
    const r = env(NEW).post({ action: 'ping' })
    expect(r.version).toBe('0.46.1')
    expect(r.sheetId).toBe('1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI')
  })

  it('integrity: old-style and new-style push on the same input give an identical sheet (A–H, Sessions, Roster)', () => {
    const a = env(OLD), b = env(NEW)
    for (const p of PUSHES) {
      const ra = a.post({ action: 'push', ...p }), rb = b.post({ action: 'push', ...p })
      expect(rb.applied).toBe(ra.applied); expect(rb.ignored).toBe(ra.ignored); expect(rb.rejected).toEqual(ra.rejected)
      expect(cols(b.ss, 'Ticks', 8)).toEqual(cols(a.ss, 'Ticks', 8))
      expect(cols(b.ss, 'Sessions', 8)).toEqual(cols(a.ss, 'Sessions', 8))
      expect(cols(b.ss, 'Roster', 7)).toEqual(cols(a.ss, 'Roster', 7))
      const sa = { ...ra.state, serverTime: 0 }, sb = { ...rb.state, serverTime: 0 }
      expect(sb.ticks.map((t: any) => { const { sub, subOff, ...x } = t; return x })).toEqual(sa.ticks)
      expect(sb.sessions).toEqual(sa.sessions); expect(sb.roster).toEqual(sa.roster)
    }
  })

  it('integrity holds with blank gap rows in Ticks (falls back to a full rewrite)', () => {
    const a = env(OLD), b = env(NEW)
    for (const e of [a, b]) e.ss.getSheetByName('Ticks')!.getRange(10, 1, 1, 8).clearContent()
    for (const p of PUSHES.slice(0, 3)) { a.post({ action: 'push', ...p }); b.post({ action: 'push', ...p }) }
    expect(cols(b.ss, 'Ticks', 8)).toEqual(cols(a.ss, 'Ticks', 8))
  })

  it('a 1-tick push writes only that row: no Ticks clear, no Sessions write', () => {
    const { ss, post } = env(NEW)
    const writes: string[] = []
    const sv = MockRange.prototype.setValues, cc = MockRange.prototype.clearContent
    MockRange.prototype.setValues = function (v) { writes.push(`${(this as any).sh.name}:set:${this.r}x${this.nr}`); return sv.call(this, v) }
    MockRange.prototype.clearContent = function () { writes.push(`${(this as any).sh.name}:clear`); return cc.call(this) }
    try { post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 4, true, '2026-10-30T01:00:00.000Z')] }) } finally {
      MockRange.prototype.setValues = sv; MockRange.prototype.clearContent = cc
    }
    expect(writes.filter((w) => w.startsWith('Ticks:'))).toEqual(['Ticks:set:5x1'])
    expect(writes.filter((w) => w.startsWith('Sessions:') || w.startsWith('Roster:'))).toEqual([])
    expect(ss.getSheetByName('Ticks')!.getRange(5, 6).getValue()).toBe(true)
  })

  it('Submitted manual flag (sub) round-trips in Ticks!J, survives old-client pushes and date moves', () => {
    const { ss, post } = env(NEW)
    let r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 2, false, '2026-10-30T01:00:00.000Z', { sub: true })] })
    expect(r.state.ticks.find((t: any) => t.tickId === 'KGA_Eng_CW|2026-10-20|2').sub).toBe(true)
    expect(ss.getSheetByName('Ticks')!.getRange(1, 10).getValue()).toBe('subManual')
    expect(ss.getSheetByName('Ticks')!.getRange(1, 9).getValue()).toBe('pupilStatus')
    r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 2, true, '2026-10-30T02:00:00.000Z')] }) // old client: no sub field
    expect(r.state.ticks.find((t: any) => t.tickId === 'KGA_Eng_CW|2026-10-20|2').sub).toBe(true)
    r = post({ action: 'push', structs: [{ kind: 'rename', subjectKey: 'KGA_Eng_CW', from: '2026-10-20', to: '2026-10-23', at: '2026-10-30T03:00:00.000Z' }] })
    expect(r.state.ticks.find((t: any) => t.tickId === 'KGA_Eng_CW|2026-10-23|2').sub).toBe(true)
    expect(r.state.ticks.filter((t: any) => t.sub).length).toBe(1)
    r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-23', 2, true, '2026-10-30T04:00:00.000Z', { sub: false })] })
    expect(r.state.ticks.filter((t: any) => t.sub).length).toBe(0)
  })

  it('t16u: subOff (manual off while Set on) round-trips as Ticks!J FALSE; blank stays derived', () => {
    const { ss, post } = env(NEW)
    let r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 2, true, '2026-10-31T01:00:00.000Z', { sub: false, subOff: true })] })
    const t = r.state.ticks.find((x: any) => x.tickId === 'KGA_Eng_CW|2026-10-20|2')
    expect(t).toMatchObject({ set: true, sub: false, subOff: true })
    r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 2, true, '2026-10-31T02:00:00.000Z')] }) // old client: keeps flag
    expect(r.state.ticks.find((x: any) => x.tickId === 'KGA_Eng_CW|2026-10-20|2').subOff).toBe(true)
    r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 2, true, '2026-10-31T03:00:00.000Z', { sub: false, subOff: false })] })
    expect(r.state.ticks.find((x: any) => x.tickId === 'KGA_Eng_CW|2026-10-20|2').subOff).toBe(false)
  })
  it('subs (migrating old manual Submitted) only turn J on — Set and stamp untouched; missing rows are created unset', () => {
    const { post } = env(NEW)
    const r = post({ action: 'push', subs: [{ subjectKey: 'KGA_Eng_CW', date: '2026-10-20', roll: 3, updatedAt: '2026-10-01T00:00:00.000Z' }, { subjectKey: 'KGB_Eng_CW', date: '2026-10-22', roll: 1, updatedAt: '2026-10-22T00:00:00.000Z' }] })
    const a = r.state.ticks.find((t: any) => t.tickId === 'KGA_Eng_CW|2026-10-20|3')
    expect(a).toMatchObject({ set: true, sub: true, updatedAt: '2026-10-20T05:00:00.000Z' })
    expect(r.state.ticks.find((t: any) => t.tickId === 'KGB_Eng_CW|2026-10-22|1')).toMatchObject({ set: false, sub: true })
    expect(post({ action: 'push', subs: [{ subjectKey: 'KGA_Eng_CW', date: '2026-10-20', roll: 3, updatedAt: '2026-10-01T00:00:00.000Z' }] }).ignored).toBe(1)
  })

  it('clock-safe: a phone 2 h behind still wins with a real (later) edit; a correct phone is not shifted', () => {
    const { post } = env(NEW)
    const now = Date.now(), iso = (ms: number) => new Date(ms).toISOString()
    post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 6, true, iso(now - 60e3))], clientNow: iso(now) }) // phone A, right clock, 1 min ago
    const slow = now - 2 * 3600e3
    const r = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 6, false, iso(slow))], clientNow: iso(slow) }) // phone B, 2 h slow, edit made now
    expect(r.applied).toBe(1)
    const t = r.state.ticks.find((x: any) => x.tickId === 'KGA_Eng_CW|2026-10-20|6')
    expect(t.set).toBe(false)
    expect(Math.abs(Date.parse(t.updatedAt) - now)).toBeLessThan(5000)
    // without clientNow (old app) behaviour is unchanged: the slow stamp loses
    const r2 = post({ action: 'push', ticks: [tick('KGA_Eng_CW', '2026-10-20', 6, true, iso(slow + 1000))] })
    expect(r2.ignored).toBe(1)
  })

  it('Left from the phone reaches Roster and comes back on pull', () => {
    const { post } = env(NEW)
    post({ action: 'push', roster: [{ classKey: 'KGB', roll: 3, status: 'Left', updatedAt: '2026-10-30T01:00:00.000Z' }] })
    const s = post({ action: 'pull' })
    expect(s.roster.find((p: any) => p.classKey === 'KGB' && p.roll === 3).status).toBe('Left')
  })
})
