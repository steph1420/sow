import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'

// v0.40.0 clock guard (Steve t55u Q-CRDT-1): stamps from the future are clamped to the server clock.
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')
function env() {
  const ss = new MockSpreadsheet()
  const { g } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
  vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  return { ss, c, token, post }
}
const iso = (ms: number) => new Date(ms).toISOString()
const DAY = 864e5

describe('clock guard', () => {
  it('every reply carries serverNow and version 0.44.0', () => {
    const { post, token } = env()
    const r = post({ action: 'ping', token })
    expect(r.version).toBe('0.44.0')
    expect(Math.abs(Date.parse(r.serverNow) - Date.now())).toBeLessThan(5000)
  })
  it('clampStamp_: future (> now+10 min) → server now; past and near-now untouched', () => {
    const { c } = env()
    const now = Date.now()
    expect(c.clampStamp_(iso(now + DAY), now)).toBe(iso(now))
    expect(c.clampStamp_(iso(now + 5 * 60e3), now)).toBe(iso(now + 5 * 60e3))
    expect(c.clampStamp_(iso(now - DAY), now)).toBe(iso(now - DAY))
  })
  it('a +1 day prefs stamp is clamped, so a later honest change still wins', () => {
    const { post, token } = env()
    const now = Date.now()
    let r = post({ action: 'prefsPush', token, deviceId: 'fast', rows: [{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: iso(now + DAY) }] })
    expect(r.clamped).toBe(1)
    r = post({ action: 'prefsPush', token, deviceId: 'ok', rows: [{ key: 'palette', category: 'appearance', value: 'default', updatedAt: iso(now + 60e3) }] })
    expect(r.prefs.find((p: any) => p.key === 'palette').value).toBe('default')
  })
})
