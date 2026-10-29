/**
 * v0.34.0 — set up another device without retyping URL + token (Steve t36u/t38u, LOCKED t39u "Lock all").
 * Setup file (.sowsetup) + Pairdrop-style 6-digit pairing via the bridge (pairStart / pairClaim / pairCancel).
 * Plan: docs/SETUP_PAIRING_PLAN.md · mocks setuppair-mj1-*.
 */
import { BridgeError } from './bridge'

export const SETUP_FILENAME = 'sow-setup.sowsetup'
export type SetupData = { syncUrl: string; token: string; sheetUrl: string; exportedAt: string }

const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/
export const isExecUrl = (u: string): boolean => EXEC_RE.test(String(u ?? '').trim())

export function buildSetupFile(s: { syncUrl: string; token: string; sheetUrl?: string }, nowIso: string, appVersion: string): string {
  return JSON.stringify(
    { kind: 'sow-setup', v: 1, syncUrl: s.syncUrl.trim(), token: s.token.trim(), sheetUrl: (s.sheetUrl ?? '').trim(), exportedAt: nowIso, appVersion },
    null,
    2,
  )
}

export function parseSetupFile(text: string): { ok: true; setup: SetupData } | { ok: false; error: string } {
  let o: Record<string, unknown>
  try {
    o = JSON.parse(text) as Record<string, unknown>
  } catch {
    return { ok: false, error: 'Not a SoW setup file' }
  }
  if (!o || o.kind !== 'sow-setup') return { ok: false, error: 'Not a SoW setup file' }
  if (o.v !== 1) return { ok: false, error: 'Setup file is from a newer app · update first' }
  const syncUrl = String(o.syncUrl ?? '').trim()
  const token = String(o.token ?? '').trim()
  if (!isExecUrl(syncUrl)) return { ok: false, error: 'Setup file has no valid Apps Script /exec URL' }
  if (!token) return { ok: false, error: 'Setup file has no token' }
  return { ok: true, setup: { syncUrl, token, sheetUrl: String(o.sheetUrl ?? '').trim(), exportedAt: String(o.exportedAt ?? '') } }
}

export const maskToken = (t: string): string => `•••••••••••••••• · ends ${String(t).slice(-4)}`

export function fmtCountdown(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Raw = { ok?: boolean; error?: string; triesLeft?: number; [k: string]: unknown }
async function post(url: string, body: Record<string, unknown>): Promise<Raw> {
  let res: Response
  try {
    res = await fetch(url.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
  } catch (e) {
    throw new BridgeError(e instanceof Error ? e.message : String(e), true)
  }
  if (!res.ok) throw new BridgeError(`Bridge HTTP ${res.status}`)
  try {
    return (await res.json()) as Raw
  } catch {
    throw new BridgeError('Bridge did not answer JSON · check the URL and that the new version is deployed')
  }
}

function words(r: Raw): string {
  switch (r.error) {
    case 'bad token': return 'Bridge refused the token'
    case 'wrong code': return `Wrong code · ${r.triesLeft ?? 0} tries left`
    case 'expired': return 'Code expired · make a new one'
    case 'locked': return 'Too many tries · make a new code'
    case 'no code': return 'No active code · make a new one on the other device'
    case 'bad code': return 'Enter 6 digits'
    case 'unknown action': return 'Bridge is older · re-paste Code.gs and deploy a New version'
    default: return `Bridge: ${r.error ?? 'error'}`
  }
}

export async function pairStart(url: string, token: string): Promise<{ code: string; expiresInSec: number }> {
  const r = await post(url, { action: 'pairStart', token })
  if (!r.ok) throw new BridgeError(words(r))
  return { code: String(r.code), expiresInSec: Number(r.expiresInSec ?? 300) }
}

export async function pairCancel(url: string, token: string): Promise<void> {
  await post(url, { action: 'pairCancel', token }).catch(() => undefined)
}

export async function pairClaim(url: string, code: string): Promise<string> {
  if (!isExecUrl(url)) throw new BridgeError('Paste the bridge URL ending in /exec')
  if (!/^\d{6}$/.test(code)) throw new BridgeError('Enter 6 digits')
  const r = await post(url, { action: 'pairClaim', code })
  if (!r.ok || !r.token) throw new BridgeError(words(r))
  return String(r.token)
}

/** Token check used after Import / Pair. Returns the bridge version. */
export async function pingBridge(url: string, token: string): Promise<string> {
  const r = await post(url, { action: 'ping', token })
  if (!r.ok) throw new BridgeError(words(r))
  return String(r.version ?? '')
}
