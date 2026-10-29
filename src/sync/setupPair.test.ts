import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSetupFile, fmtCountdown, isExecUrl, maskToken, pairClaim, pairStart, parseSetupFile, pingBridge, SETUP_FILENAME } from './setupPair'

// v0.34.0 setup file + pairing client (Steve t38u/t39u "Lock all", setuppair-mj1).
const URL = 'https://script.google.com/macros/s/AKfyDEMO_abc-123/exec'

describe('setup file', () => {
  it('round-trips URL + token (+ sheet) as kind sow-setup v1', () => {
    const txt = buildSetupFile({ syncUrl: URL, token: 'tok123456789', sheetUrl: '' }, '2026-10-29T17:40:00.000Z', '0.34.0')
    const o = JSON.parse(txt)
    expect(o).toMatchObject({ kind: 'sow-setup', v: 1, syncUrl: URL, token: 'tok123456789', exportedAt: '2026-10-29T17:40:00.000Z', appVersion: '0.34.0' })
    expect(parseSetupFile(txt)).toEqual({ ok: true, setup: { syncUrl: URL, token: 'tok123456789', sheetUrl: '', exportedAt: '2026-10-29T17:40:00.000Z' } })
    expect(SETUP_FILENAME).toBe('sow-setup.sowsetup')
  })
  it('rejects junk, wrong kind/version, bad URL, empty token', () => {
    expect(parseSetupFile('not json').ok).toBe(false)
    expect(parseSetupFile(JSON.stringify({ kind: 'x', v: 1, syncUrl: URL, token: 't' })).ok).toBe(false)
    expect(parseSetupFile(JSON.stringify({ kind: 'sow-setup', v: 2, syncUrl: URL, token: 't' })).ok).toBe(false)
    expect(parseSetupFile(JSON.stringify({ kind: 'sow-setup', v: 1, syncUrl: 'https://evil.example/exec', token: 't' })).ok).toBe(false)
    expect(parseSetupFile(JSON.stringify({ kind: 'sow-setup', v: 1, syncUrl: URL, token: ' ' })).ok).toBe(false)
  })
  it('isExecUrl / maskToken / fmtCountdown', () => {
    expect(isExecUrl(URL)).toBe(true)
    expect(isExecUrl('https://script.google.com/macros/s/x/dev')).toBe(false)
    expect(maskToken('abcdefgh7Kq2')).toBe('•••••••••••••••• · ends 7Kq2')
    expect(fmtCountdown(300)).toBe('5:00')
    expect(fmtCountdown(59.2)).toBe('1:00')
    expect(fmtCountdown(9)).toBe('0:09')
    expect(fmtCountdown(-3)).toBe('0:00')
  })
})

describe('pair client', () => {
  afterEach(() => vi.unstubAllGlobals())
  const reply = (o: object) => vi.fn(async () => new Response(JSON.stringify(o), { status: 200 }))

  it('pairStart sends the token and returns code + expiry', async () => {
    const f = reply({ ok: true, code: '482913', expiresInSec: 300, version: '0.34.0' })
    vi.stubGlobal('fetch', f)
    await expect(pairStart(URL, 'tok')).resolves.toMatchObject({ code: '482913', expiresInSec: 300 })
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ action: 'pairStart', token: 'tok' })
  })
  it('pairClaim sends only the code and maps errors to plain words', async () => {
    const f = reply({ ok: true, token: 'tok', version: '0.34.0' })
    vi.stubGlobal('fetch', f)
    await expect(pairClaim(URL, '482913')).resolves.toBe('tok')
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ action: 'pairClaim', code: '482913' })
    vi.stubGlobal('fetch', reply({ ok: false, error: 'wrong code', triesLeft: 3 }))
    await expect(pairClaim(URL, '000000')).rejects.toThrow('Wrong code · 3 tries left')
    vi.stubGlobal('fetch', reply({ ok: false, error: 'expired' }))
    await expect(pairClaim(URL, '000000')).rejects.toThrow(/expired/i)
    vi.stubGlobal('fetch', reply({ ok: false, error: 'locked' }))
    await expect(pairClaim(URL, '000000')).rejects.toThrow(/Too many tries/)
  })
  it('pairClaim refuses a bad URL or code without calling the bridge', async () => {
    const f = reply({ ok: true })
    vi.stubGlobal('fetch', f)
    await expect(pairClaim('https://x.example/exec', '123456')).rejects.toThrow(/URL/)
    await expect(pairClaim(URL, '12345')).rejects.toThrow(/6 digits/)
    expect(f).not.toHaveBeenCalled()
  })
  it('pingBridge reports the bridge version, throws on a bad token', async () => {
    vi.stubGlobal('fetch', reply({ ok: true, schema: 1, version: '0.34.0' }))
    await expect(pingBridge(URL, 'tok')).resolves.toBe('0.34.0')
    vi.stubGlobal('fetch', reply({ ok: false, error: 'bad token' }))
    await expect(pingBridge(URL, 'x')).rejects.toThrow(/token/)
  })
})
