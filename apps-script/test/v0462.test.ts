import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'

// v0.46.2 (Steve t29u): fixes for the break-it run (docs/TEST_CATALOG.md, BUGS B-0462-1…6). Written before the fix.
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
const SK = 'KGA_Eng_CW'
function env() {
  const ss = new MockSpreadsheet('1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI')
  const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, isNaN })
  vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  c.buildTabs_(ss)
  ss.getSheetByName('Subjects')!.getRange(2, 1, 1, 7).setValues([[SK, 'KGA', 'Eng', 'CW', true, 1, '2026-10-01']])
  const roster: unknown[][] = []; for (let r = 1; r <= 20; r++) roster.push(['KGA', r, `Demo KGA ${r}`, 'Active', '', '', '2026-10-01T00:00:00.000Z'])
  ss.getSheetByName('Roster')!.getRange(2, 1, roster.length, 7).setValues(roster)
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify({ token, ...body }) } }).text)
  const push = (o: object) => post({ action: 'push', clientNow: new Date().toISOString(), ...o })
  return { ss, c, post, push }
}
const iso = (ms = Date.now()) => new Date(ms).toISOString()
const tk = (date: string, roll: unknown, at = iso(), x: object = {}) => ({ subjectKey: SK, date, topic: 'T', roll, set: true, updatedAt: at, ...x })

describe('B-0462-1 shifted stamps never pass server time', () => {
  it('a replayed push (old clientNow) is stamped no later than server now', () => {
    const { push, post } = env(); const now = Date.now()
    push({ clientNow: iso(now - 5 * 60e3), ticks: [tk('2026-10-20', 1, iso(now - 1000))] })
    const t = post({ action: 'pull' }).ticks[0]
    expect(Date.parse(t.updatedAt)).toBeLessThanOrEqual(Date.now())
  })
  it('a correct-clock edit right after the replay still wins', () => {
    const { push, post } = env(); const now = Date.now()
    push({ clientNow: iso(now - 5 * 60e3), ticks: [tk('2026-10-20', 1, iso(now - 1000))] })
    const t0 = Date.now(); while (Date.now() === t0) { /* next ms */ }
    const r = push({ ticks: [tk('2026-10-20', 1, iso(), { set: false })] })
    expect(r.applied).toBe(1); expect(post({ action: 'pull' }).ticks[0].set).toBe(false)
  })
})
describe('B-0462-2 impossible dates are rejected everywhere', () => {
  for (const d of ['2027-02-30', '2027-04-31', '2026-13-01', '2027-00-10', '2026-02-29']) it(`tick/session/rename/delete ${d}`, () => {
    const { push, post } = env()
    const r = push({ ticks: [tk(d, 1)], sessions: [{ subjectKey: SK, date: d, topic: 'x', updatedAt: iso() }] })
    expect(r.applied).toBe(0); expect(r.sessionsApplied).toBe(0); expect(post({ action: 'pull' }).sessions.length).toBe(0)
    const s = push({ structs: [{ kind: 'rename', subjectKey: SK, from: d, to: '2026-10-21', at: iso() }, { kind: 'delete', subjectKey: SK, date: d, at: iso() }] })
    expect(s.rejected.length).toBe(2)
  })
  it('2028-02-29 (leap day) is accepted', () => { const { push } = env(); expect(push({ ticks: [tk('2028-02-29', 1)] }).applied).toBe(1) })
})
describe('B-0462-3 topics are stored as plain text', () => {
  for (const topic of ['=1+1', "'quoted", '=IMPORTXML("http://x","//a")']) it(topic, () => {
    const { push, ss } = env()
    push({ sessions: [{ subjectKey: SK, date: '2026-10-20', topic, updatedAt: iso() }] })
    expect(ss.getSheetByName('Sessions')!.rows()[1][4]).toBe("'" + topic) // Sheets shows the text after the apostrophe
    push({ ticks: [tk('2026-10-22', 1, iso(), { topic })] })
    expect(ss.getSheetByName('Sessions')!.rows()[2][4]).toBe("'" + topic)
  })
  it('ordinary topics are unchanged', () => { const { push, ss } = env(); push({ sessions: [{ subjectKey: SK, date: '2026-10-20', topic: 'Phonics: a-e', updatedAt: iso() }] }); expect(ss.getSheetByName('Sessions')!.rows()[1][4]).toBe('Phonics: a-e') })
})
describe('B-0462-4 only whole-number rolls on the class roster', () => {
  it('999, 1.5, 1e9, 21 rejected; 7 and "7" accepted', () => {
    const { push, post } = env()
    const r = push({ ticks: [tk('2026-10-20', 999), tk('2026-10-20', 1.5), tk('2026-10-20', 1e9), tk('2026-10-20', 21), tk('2026-10-20', 7), tk('2026-10-21', '7')] })
    expect(r.applied).toBe(2); expect(r.rejected.length).toBe(4)
    expect(post({ action: 'pull' }).ticks.map((t: { roll: number }) => t.roll).sort()).toEqual([7, 7])
  })
  it('subs migration op for a phantom roll is rejected', () => { const { push } = env(); expect(push({ subs: [{ subjectKey: SK, date: '2026-10-20', roll: 99, updatedAt: iso() }] }).rejected.length).toBe(1) })
})
describe('B-0462-5 bad topic types and pupil statuses', () => {
  it('a non-string topic in a session op is rejected', () => {
    const { push } = env()
    const r = push({ sessions: [{ subjectKey: SK, date: '2026-10-20', topic: { a: 1 }, updatedAt: iso() }, { subjectKey: SK, date: '2026-10-21', topic: 5, updatedAt: iso() }] })
    expect(r.sessionsApplied).toBe(0); expect(r.rejected.length).toBe(2)
  })
  it('a null topic still clears (old apps)', () => { const { push } = env(); expect(push({ sessions: [{ subjectKey: SK, date: '2026-10-20', topic: null, updatedAt: iso() }] }).sessionsApplied).toBe(1) })
  it('an unknown pupil status is rejected', () => {
    const { push, post } = env()
    const r = push({ roster: [{ classKey: 'KGA', roll: 3, status: 'Gone', updatedAt: iso() }] })
    expect(r.applied).toBe(0); expect(r.rejected.length).toBe(1)
    expect(post({ action: 'pull' }).roster[2].updatedAt).toBe('2026-10-01T00:00:00.000Z')
  })
})
describe('B-0462-6 tombstones are pruned and capped', () => {
  it('tombs older than TOMB_MAX_AGE_DAYS are dropped on save', () => {
    const { c } = env(); const old = iso(Date.now() - (c.TOMB_MAX_AGE_DAYS as unknown as number + 1) * 864e5)
    c.saveTombs_({ [`${SK}|2026-01-01`]: old, [`${SK}|2026-10-01`]: iso() })
    expect(Object.keys(c.tombs_())).toEqual([`${SK}|2026-10-01`])
  })
  it('only the newest TOMB_MAX entries are kept and the property stays under 9 KB', () => {
    const { c } = env(); const t: Record<string, string> = {}
    for (let i = 0; i < 400; i++) t[`${SK}|2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}x${i}`] = iso(Date.now() - i * 60e3)
    c.saveTombs_(t); const kept = c.tombs_()
    expect(Object.keys(kept).length).toBe(c.TOMB_MAX as unknown as number)
    expect(kept[`${SK}|2026-01-01x0`]).toBeTruthy()
    expect(JSON.stringify(kept).length).toBeLessThan(9000)
  })
})
