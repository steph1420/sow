/** v0.36.1 (t55u Q-CRDT-1): compare this device's clock with the bridge's serverNow and warn when it is off. */
const KEY = 'sow-app.clockSkew'
const SLACK = 10 * 60e3

export function noteServerNow(serverNow: unknown, localMs = Date.now()): void {
  const s = Date.parse(String(serverNow ?? ''))
  if (isNaN(s)) return
  try { localStorage.setItem(KEY, JSON.stringify({ skewMs: localMs - s, at: new Date(s).toISOString() })) } catch { /* private */ }
}
export function readSkew(): { skewMs: number; at: string } | null {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null } catch { return null }
}
function human(ms: number): string {
  const m = Math.round(ms / 60e3), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60
  return [d ? `${d} day${d > 1 ? 's' : ''}` : '', h ? `${h} h` : '', !d && mm ? `${mm} min` : ''].filter(Boolean).join(' ') || '0 min'
}
/** skewMs > 0 = phone ahead. Empty string when within 10 min. */
export function clockWarning(skewMs: number | undefined | null): string {
  if (skewMs == null || Math.abs(skewMs) <= SLACK) return ''
  return `This phone's clock is ${human(Math.abs(skewMs))} ${skewMs > 0 ? 'fast' : 'slow'}. Fix Date & time in the phone's settings — the sheet corrects ticks made meanwhile.`
}
