import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'

// v0.36.0 prefs sync (Steve t52u; docs/PREFS_SYNC_PLAN.md). Hidden Prefs tab, per-key rows, newer wins.
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
function env() {
  const ss = new MockSpreadsheet()
  const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
  vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  return { ss, token, post }
}
const row = (key: string, value: unknown, updatedAt: string, category = 'appearance') => ({ key, category, value, updatedAt })

describe('prefs bridge', () => {
  it('needs the token', () => {
    const { post } = env()
    expect(post({ action: 'prefsPull', token: 'x' })).toMatchObject({ ok: false, error: 'bad token' })
  })
  it('prefsPull on a fresh sheet creates a hidden Prefs tab and returns []', () => {
    const { post, token, ss } = env()
    const r = post({ action: 'prefsPull', token })
    expect(r).toMatchObject({ ok: true, prefs: [], version: '0.36.0' })
    const s = ss.getSheetByName('Prefs') as any
    expect(s).toBeTruthy(); expect(s.isHidden).toBe(true)
    expect(s.getRange(1, 1, 1, 5).getValues()[0]).toEqual(['key', 'category', 'value', 'updatedAt', 'deviceId'])
  })
  it('push stores one row per key; newer wins per key, older ignored', () => {
    const { post, token } = env()
    let r = post({ action: 'prefsPush', token, deviceId: 'dA', rows: [row('palette', '8-black-and-pink', '2026-10-29T18:00:00.000Z'), row('theme', 'night', '2026-10-29T18:00:00.000Z')] })
    expect(r).toMatchObject({ ok: true, applied: 2, ignored: 0 })
    r = post({ action: 'prefsPush', token, deviceId: 'dB', rows: [row('palette', 'default', '2026-10-29T17:00:00.000Z'), row('theme', 'day', '2026-10-29T19:00:00.000Z')] })
    expect(r).toMatchObject({ applied: 1, ignored: 1 })
    const m = Object.fromEntries(r.prefs.map((p: any) => [p.key, p]))
    expect(m.palette).toMatchObject({ value: '8-black-and-pink', deviceId: 'dA' })
    expect(m.theme).toMatchObject({ value: 'day', deviceId: 'dB', category: 'appearance' })
  })
  it('values round-trip as JSON (arrays/objects/numbers)', () => {
    const { post, token } = env()
    const tpl = [{ id: 'pending', name: 'Pending', body: 'x' }]
    const r = post({ action: 'prefsPush', token, deviceId: 'd', rows: [row('share.templates', tpl, '2026-10-29T18:00:00.000Z', 'share'), row('sync.yearStartMonth', 4, '2026-10-29T18:00:00.000Z', 'year')] })
    const m = Object.fromEntries(r.prefs.map((p: any) => [p.key, p.value]))
    expect(m['share.templates']).toEqual(tpl); expect(m['sync.yearStartMonth']).toBe(4)
  })
  it('unknown future keys are kept and returned', () => {
    const { post, token } = env()
    post({ action: 'prefsPush', token, deviceId: 'new', rows: [row('future.option', true, '2026-10-29T18:00:00.000Z', 'gestures')] })
    expect(post({ action: 'prefsPull', token }).prefs.map((p: any) => p.key)).toContain('future.option')
  })
  it('never stores token / URLs / device-only keys', () => {
    const { post, token } = env()
    const r = post({ action: 'prefsPush', token, deviceId: 'd', rows: [row('bridgeToken', 'SECRET', '2026-10-29T18:00:00.000Z'), row('syncUrl', 'u', '2026-10-29T18:00:00.000Z'), row('sheetUrl', 'u', '2026-10-29T18:00:00.000Z'), row('haptics.level', 'off', '2026-10-29T18:00:00.000Z'), row('chrome.reduceMotion', true, '2026-10-29T18:00:00.000Z')] })
    expect(r.applied).toBe(0); expect(r.prefs).toEqual([])
    expect(JSON.stringify(r)).not.toContain('SECRET')
  })
  it('old actions unchanged (backward compatible)', () => {
    const { post, token } = env()
    expect(post({ action: 'ping', token })).toMatchObject({ ok: true })
    expect(post({ action: 'nope', token })).toMatchObject({ ok: false, error: 'unknown action' })
  })
})
