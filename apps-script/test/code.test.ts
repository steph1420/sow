import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSheet, MockSpreadsheet, makeGlobals } from './mockSheets'

const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')

function load(ss: MockSpreadsheet) {
  const { g, props, created } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error })
  vm.runInContext(CODE, ctx)
  return { ctx: ctx as Record<string, (...a: unknown[]) => any>, props, created }
}

/** Old-layout tab with demo names only (never real pupils). */
function oldTab(ss: MockSpreadsheet, name: string, n: number, d1: unknown, t1: string, d2: unknown, t2: string, ticks: [boolean, boolean][]) {
  const s = ss.insertSheet(name)
  s.appendRow(['Roll', 'Name', 'Date / Topic', 'Date / Topic', '', 'Current'])
  s.getRange(2, 3, 2, 2).setValues([[d1, d2], [t1, t2]])
  s.getRange(2, 6, 3, 2).setValues([['Date', 'Topic'], [d1, t1], [d2, t2]])
  for (let i = 0; i < n; i++) s.getRange(4 + i, 1, 1, 4).setValues([[i + 1, `Pupil ${name.slice(0, 3)} ${i + 1}`, ticks[i]![0], ticks[i]![1]]])
  return s
}

function fixture() {
  const ss = new MockSpreadsheet()
  oldTab(ss, 'KGA Eng CW', 3, '28/10', 'Q', new Date(2026, 1, 11), 'Q', [[true, false], [false, true], [true, true]])
  oldTab(ss, 'KGA Eng HW', 3, new Date(2026, 6, 10), 'P p', '14/10', 'P p', [[true, true], [false, false], [true, false]])
  oldTab(ss, 'KGB Eng CW', 2, '30/9', 'N n', '', '', [[true, false], [false, false]])
  const meta = ss.insertSheet('SoW_RosterMeta')
  meta.appendRow(['classKey', 'roll', 'name', 'left', 'updatedAt'])
  meta.appendRow(['KGA_Eng_CW', 2, 'Pupil KGA 2', true, '2026-10-27T12:30:00+05:30'])
  meta.appendRow(['KGA_Eng_HW', 2, 'Pupil KGA 2', true, '2026-10-27T12:30:00+05:30'])
  return ss
}

const NOW = '2026-10-29T16:00:00.000Z'

describe('setup + migrate', () => {
  it('builds the clean tabs, locale en_IN, token, and migrates C/D into separate Sessions', () => {
    const ss = fixture()
    const { ctx, props } = load(ss)
    const r = ctx.setupAndMigrate_(ss, NOW)
    expect(ss.locale).toBe('en_IN')
    expect(ss.tz).toBe('Asia/Kolkata')
    for (const t of ['Roster', 'Subjects', 'Sessions', 'Ticks', 'Entry', 'Dashboard', '_Meta']) expect(ss.getSheetByName(t)).not.toBeNull()
    expect(props.get('SOW_TOKEN')).toBeTruthy()

    const roster = ss.getSheetByName('Roster')!.rows().slice(1)
    expect(roster.length).toBe(5) // KGA 3 (deduped across CW/HW) + KGB 2
    expect(roster.find((x) => x[0] === 'KGA' && x[1] === 2)![3]).toBe('Left')
    expect(roster.filter((x) => x[3] === 'Left').length).toBe(1)

    const subjects = ss.getSheetByName('Subjects')!.rows().slice(1).map((x) => x[0])
    expect(subjects).toEqual(['KGA_Eng_CW', 'KGA_Eng_HW', 'KGB_Eng_CW'])

    const sessions = ss.getSheetByName('Sessions')!.rows().slice(1)
    const ids = sessions.map((x) => x[0]).sort()
    // 28/10 text → 2026-10-28; real date 2026-02-11 typed in mm/dd → swapped to 2 Nov; 2026-07-10 → 7 Oct
    expect(ids).toEqual(['KGA_Eng_CW|2026-10-28', 'KGA_Eng_CW|2026-11-02', 'KGA_Eng_HW|2026-10-07', 'KGA_Eng_HW|2026-10-14', 'KGB_Eng_CW|2026-09-30'])
    expect(r.flags.join(' ')).toMatch(/swapped/)

    const ticks = ss.getSheetByName('Ticks')!.rows().slice(1)
    expect(ticks.length).toBe(3 * 2 + 3 * 2 + 2) // KGB D column has no session → skipped
    const t = (id: string) => ticks.find((x) => x[0] === id)!
    expect(t('KGA_Eng_CW|2026-10-28|1')[5]).toBe(true)
    expect(t('KGA_Eng_CW|2026-11-02|1')[5]).toBe(false)
    expect(t('KGA_Eng_CW|2026-11-02|2')[5]).toBe(true)
    // only A:H written by the script; I is the formula column
    expect(ss.getSheetByName('Ticks')!.getRange(2, 9).getFormula()).toMatch(/VLOOKUP/)
    // old tabs archived (renamed), not deleted
    expect(ss.getSheetByName('OLD KGA Eng CW')).not.toBeNull()
  })

  it('refuses to run twice (never clobbers the new tabs)', () => {
    const ss = fixture()
    const { ctx } = load(ss)
    ctx.setupAndMigrate_(ss, NOW)
    expect(() => ctx.setupAndMigrate_(ss, NOW)).toThrow(/already/)
  })

  it('Dashboard is formulas only: Set, Set %, Not Set, names not Set, Left excluded', () => {
    const ss = fixture()
    const { ctx } = load(ss)
    ctx.setupAndMigrate_(ss, NOW)
    const d = ss.getSheetByName('Dashboard')!
    const f = [1, 6, 7, 8, 9, 10].map((c) => d.getRange(2, c).getFormula()).join('\n')
    expect(f).toMatch(/SORT\(FILTER/)
    expect(f).toMatch(/Roster!D2:D,"Active"/)
    expect(f).toMatch(/Ticks!I2:I,"Active"/)
    expect(f).toMatch(/TEXTJOIN/)
    expect(f).not.toMatch(/ubmitted/)
  })
})

describe('bridge', () => {
  function ready() {
    const ss = fixture()
    const env = load(ss)
    env.ctx.setupAndMigrate_(ss, NOW)
    const token = env.props.get('SOW_TOKEN')!
    const call = (body: object) => JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify({ token, ...body }) } }).text)
    return { ss, ...env, token, call }
  }

  it('v0.36.1 clock guard: a tick stamped a day ahead is clamped; a later honest un-tick still wins', () => {
    const { call } = ready()
    const day = 864e5, now = Date.now()
    let r = call({ action: 'push', ticks: [{ subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Q', roll: 2, set: true, updatedAt: new Date(now + day).toISOString() }] })
    expect(r.clamped).toBe(1)
    r = call({ action: 'push', ticks: [{ subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Q', roll: 2, set: false, updatedAt: new Date(now + 60e3).toISOString() }] })
    expect(r.applied).toBe(1)
    expect(r.state.ticks.find((t: any) => t.tickId === 'KGA_Eng_CW|2026-10-28|2').set).toBe(false)
  })

  it('rejects a bad token', () => {
    const { ctx } = ready()
    const out = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: 'nope', action: 'pull' }) } }).text)
    expect(out).toMatchObject({ ok: false, error: 'bad token' })
  })

  it('pull returns subjects, roster, sessions, ticks with ISO dates', () => {
    const { call } = ready()
    const s = call({ action: 'pull' })
    expect(s.ok).toBe(true)
    expect(s.subjects.map((x: any) => x.subjectKey)).toContain('KGA_Eng_HW')
    expect(s.sessions.find((x: any) => x.sessionId === 'KGA_Eng_CW|2026-10-28').date).toBe('2026-10-28')
    expect(s.roster.find((x: any) => x.classKey === 'KGA' && x.roll === 2).status).toBe('Left')
    expect(s.ticks.length).toBe(14)
  })

  it('push: per-tick newer wins, older ignored, new session created, unknown subject rejected', () => {
    const { call, ss } = ready()
    const out = call({
      action: 'push',
      ticks: [
        { subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Q', roll: 2, set: true, updatedAt: '2026-10-29T17:00:00.000Z' },
        { subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Q', roll: 1, set: false, updatedAt: '2020-01-01T00:00:00.000Z' },
        { subjectKey: 'KGA_Eng_CW', date: '2026-11-05', topic: 'R', roll: 1, set: true, updatedAt: '2026-11-05T05:00:00.000Z' },
        { subjectKey: 'KGA_Math_CW', date: '2026-11-05', topic: 'X', roll: 1, set: true, updatedAt: '2026-11-05T05:00:00.000Z' },
      ],
    })
    expect(out.ok).toBe(true)
    expect(out.applied).toBe(2)
    expect(out.ignored).toBe(1)
    expect(out.rejected[0]).toMatch(/KGA_Math_CW/)
    const ticks = ss.getSheetByName('Ticks')!.rows().slice(1)
    expect(ticks.find((x) => x[0] === 'KGA_Eng_CW|2026-10-28|2')![5]).toBe(true)
    expect(ticks.find((x) => x[0] === 'KGA_Eng_CW|2026-10-28|1')![5]).toBe(true)
    expect(out.state.sessions.some((x: any) => x.sessionId === 'KGA_Eng_CW|2026-11-05' && x.topic === 'R')).toBe(true)
    // formula column untouched
    expect(ss.getSheetByName('Ticks')!.getRange(2, 9).getFormula()).toMatch(/VLOOKUP/)
  })

  it('v0.40.0 push sessions: topic edit newer-wins, older ignored, new session created, reports sessionsApplied; ticks untouched', () => {
    const { call, ss } = ready()
    const before = ss.getSheetByName('Ticks')!.rows().length
    const out = call({
      action: 'push',
      sessions: [
        { subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Nouns (edited)', updatedAt: '2026-10-29T18:00:00.000Z' },
        { subjectKey: 'KGA_Eng_HW', date: '2026-10-14', topic: 'old', updatedAt: '2000-01-01T00:00:00.000Z' },
        { subjectKey: 'KGB_Eng_CW', date: '2026-11-09', topic: 'Brand new', updatedAt: '2026-10-29T18:00:00.000Z' },
        { subjectKey: 'KGA_Math_CW', date: '2026-11-09', topic: 'X', updatedAt: '2026-10-29T18:00:00.000Z' },
      ],
    })
    expect(out.ok).toBe(true)
    expect(out.sessionsApplied).toBe(2)
    expect(out.rejected[0]).toMatch(/KGA_Math_CW/)
    const ses = out.state.sessions
    expect(ses.find((x: any) => x.sessionId === 'KGA_Eng_CW|2026-10-28').topic).toBe('Nouns (edited)')
    expect(ses.find((x: any) => x.sessionId === 'KGA_Eng_HW|2026-10-14').topic).toBe('P p')
    expect(ses.find((x: any) => x.sessionId === 'KGB_Eng_CW|2026-11-09').topic).toBe('Brand new')
    expect(ss.getSheetByName('Ticks')!.rows().length).toBe(before)
  })

  it('v0.40.0 old app push without sessions still works (backward compatible)', () => {
    const { call } = ready()
    const out = call({ action: 'push', ticks: [], roster: [] })
    expect(out.ok).toBe(true)
    expect(out.sessionsApplied).toBe(0)
  })

  it('push grows the Ticks tab past its 1000 rows instead of failing', () => {
    const { call, ss } = ready()
    const ticks = []
    for (let d = 1; d <= 25; d++) for (let roll = 1; roll <= 45; roll++) ticks.push({ subjectKey: 'KGB_Eng_CW', date: `2026-12-${String(d).padStart(2, '0')}`, topic: 'T', roll, set: true, updatedAt: '2026-12-31T00:00:00.000Z' })
    const out = call({ action: 'push', ticks })
    expect(out.ok).toBe(true)
    expect(out.applied).toBe(1125)
    expect(ss.getSheetByName('Ticks')!.getLastRow()).toBe(1 + 14 + 1125)
  })

  it('push roster: Left per class section, newer wins, never invents pupils', () => {
    const { call, ss } = ready()
    const out = call({ action: 'push', roster: [
      { classKey: 'KGB', roll: 1, status: 'Left', updatedAt: '2026-10-29T17:00:00.000Z' },
      { classKey: 'KGB', roll: 99, status: 'Left', updatedAt: '2026-10-29T17:00:00.000Z' },
    ] })
    expect(out.applied).toBe(1)
    const r = ss.getSheetByName('Roster')!.rows().slice(1)
    expect(r.find((x) => x[0] === 'KGB' && x[1] === 1)![3]).toBe('Left')
    expect(r.find((x) => x[0] === 'KGA' && x[1] === 1)![3]).toBe('Active')
    expect(r.length).toBe(5)
  })
})

describe('onEdit', () => {
  it('Entry: choosing subject+date lists Active pupils; ticking writes a Ticks row', () => {
    const ss = fixture()
    const { ctx } = load(ss)
    ctx.setupAndMigrate_(ss, NOW)
    const e = ss.getSheetByName('Entry')!
    e.getRange(1, 2).setValue('KGA_Eng_CW')
    ctx.onEdit({ range: e.getRange(1, 2), source: ss })
    e.getRange(2, 2).setValue(new Date(2026, 10, 9))
    e.getRange(3, 2).setValue('S s')
    ctx.onEdit({ range: e.getRange(2, 2), source: ss })
    const listed = e.rows().slice(4).filter((x) => x[0] !== '')
    expect(listed.map((x) => x[0])).toEqual([1, 3]) // roll 2 is Left
    e.getRange(5, 3).setValue(true)
    ctx.onEdit({ range: e.getRange(5, 3), source: ss })
    const ticks = ss.getSheetByName('Ticks')!.rows().slice(1)
    const row = ticks.find((x) => x[0] === 'KGA_Eng_CW|2026-11-09|1')!
    expect(row[5]).toBe(true)
    expect(row[7]).toBe('sheet')
    expect(ss.getSheetByName('Sessions')!.rows().some((x) => x[0] === 'KGA_Eng_CW|2026-11-09' && x[4] === 'S s')).toBe(true)
  })

  it('stamps updatedAt (and leftOn) when Steve edits Roster by hand', () => {
    const ss = fixture()
    const { ctx } = load(ss)
    ctx.setupAndMigrate_(ss, NOW)
    const r = ss.getSheetByName('Roster')!
    r.getRange(2, 4).setValue('Left')
    ctx.onEdit({ range: r.getRange(2, 4), source: ss })
    expect(String(r.getRange(2, 7).getValue())).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(r.getRange(2, 5).getValue()).toBeInstanceOf(Date)
  })
})

describe('removeSubject', () => {
  it('backs up to a new Drive spreadsheet, returns a download link, then removes rows', () => {
    const ss = fixture()
    const { ctx, created } = load(ss)
    ctx.setupAndMigrate_(ss, NOW)
    const out = ctx.removeSubject_(ss, 'KGA_Eng_HW', NOW)
    expect(created.length).toBe(1)
    expect(out.downloadUrl).toBe('https://docs.google.com/spreadsheets/d/BACKUP_0/export?format=xlsx')
    expect(out.ticks).toBe(6)
    const backup = created[0]!
    expect(backup.getSheetByName('Ticks')!.rows().length).toBe(7)
    expect(ss.getSheetByName('Subjects')!.rows().some((x) => x[0] === 'KGA_Eng_HW')).toBe(false)
    expect(ss.getSheetByName('Ticks')!.rows().some((x) => x[2] === 'KGA_Eng_HW')).toBe(false)
    expect(ss.getSheetByName('Sessions')!.rows().some((x) => x[1] === 'KGA_Eng_HW')).toBe(false)
  })
})

void MockSheet
