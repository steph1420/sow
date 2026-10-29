import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { MockSpreadsheet, makeGlobals } from './mockSheets'

// v0.34.0 device pairing (Steve t38u/t39u, docs/SETUP_PAIRING_PLAN.md). Bridge logic on the mock sheet.
const CODE = readFileSync(new URL('../Code.js', import.meta.url), 'utf8')

function env() {
  const ss = new MockSpreadsheet()
  const { g, props } = makeGlobals(ss)
  const ctx = vm.createContext({ ...g, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, parseInt })
  vm.runInContext(CODE, ctx)
  const c = ctx as Record<string, (...a: unknown[]) => any>
  const token = c.token_()
  const post = (body: object) => JSON.parse(c.doPost({ postData: { contents: JSON.stringify(body) } }).text)
  return { c, props, token, post }
}
const T0 = Date.UTC(2026, 9, 29, 18, 0, 0)

describe('pairing bridge', () => {
  it('pairStart needs the token', () => {
    const { post } = env()
    expect(post({ action: 'pairStart', token: 'nope' })).toMatchObject({ ok: false, error: 'bad token' })
  })

  it('pairStart returns 6 digits, stores only a salted hash, 300 s expiry; replies carry version', () => {
    const { post, token, props } = env()
    const r = post({ action: 'pairStart', token })
    expect(r.ok).toBe(true)
    expect(r.code).toMatch(/^\d{6}$/)
    expect(r.expiresInSec).toBe(300)
    expect(r.version).toBe('0.40.0')
    const raw = props.get('SOW_PAIR')!
    expect(raw).toBeTruthy()
    expect(raw).not.toContain(r.code)
    const st = JSON.parse(raw)
    expect(st.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(st.tries).toBe(0)
  })

  it('pairClaim swaps the right code for the token exactly once', () => {
    const { post, token } = env()
    const { code } = post({ action: 'pairStart', token })
    const ok = post({ action: 'pairClaim', code })
    expect(ok).toMatchObject({ ok: true, token, version: '0.40.0' })
    expect(post({ action: 'pairClaim', code })).toMatchObject({ ok: false, error: 'no code' })
  })

  it('expires after 300 s', () => {
    const { c, token } = env()
    const { code } = c.pairStart_(T0)
    expect(c.pairClaim_(code, T0 + 299_000)).toMatchObject({ ok: true, token })
    const again = c.pairStart_(T0)
    expect(c.pairClaim_(again.code, T0 + 301_000)).toMatchObject({ ok: false, error: 'expired' })
  })

  it('locks the code after 5 wrong tries (even the right one fails after)', () => {
    const { c } = env()
    const { code } = c.pairStart_(T0)
    const wrong = code === '000000' ? '000001' : '000000'
    for (let i = 1; i <= 4; i++) expect(c.pairClaim_(wrong, T0)).toMatchObject({ ok: false, error: 'wrong code', triesLeft: 5 - i })
    expect(c.pairClaim_(wrong, T0)).toMatchObject({ ok: false, error: 'locked' })
    expect(c.pairClaim_(code, T0)).toMatchObject({ ok: false, error: 'no code' })
  })

  it('rejects malformed codes without counting, pairCancel (token) clears, new pairStart replaces old', () => {
    const { c, post, token, props } = env()
    const a = c.pairStart_(T0)
    expect(c.pairClaim_('12ab', T0)).toMatchObject({ ok: false, error: 'bad code' })
    const b = c.pairStart_(T0)
    if (a.code !== b.code) expect(c.pairClaim_(a.code, T0)).toMatchObject({ ok: false, error: 'wrong code' })
    expect(post({ action: 'pairCancel', token: 'nope' })).toMatchObject({ ok: false })
    expect(post({ action: 'pairCancel', token })).toMatchObject({ ok: true })
    expect(props.get('SOW_PAIR')).toBeUndefined()
  })

  it('ping checks the token and reports version', () => {
    const { post, token } = env()
    expect(post({ action: 'ping', token })).toMatchObject({ ok: true, version: '0.40.0', schema: 1 })
    expect(post({ action: 'ping', token: 'x' })).toMatchObject({ ok: false, error: 'bad token', version: '0.40.0' })
  })
})
