// Shared helpers for adversarial bridge tests. TEST copy ONLY. Token from env, never printed.
import fs from 'node:fs'
export const URL_ = 'https://script.google.com/macros/s/AKfycbxU01l41mPcriTlPOXsrvh3krmiWuRh97UM1McXO9vZoJPF07woCDF17gLvnwOoYXkAtA/exec'
export const LIVE_ID = '1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ'
export const TEST_ID = '1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI'
const LOG = '/workspace/sow-build/progress.log'
export const log = (m) => { const l = `${new Date().toLocaleString('sv-SE')} ${m}`; fs.appendFileSync(LOG, l + '\n'); console.log(l) }
const TOK = process.env.SOW_TEST_BRIDGE_TOKEN
if (!TOK) { console.error('no token'); process.exit(3) }
export async function raw(body, { token = TOK, text } = {}) {
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: text ?? JSON.stringify({ token, ...body }), signal: AbortSignal.timeout(90000) })
  const t = await r.text(); try { return JSON.parse(t) } catch { return { _nonJson: t.slice(0, 200), status: r.status } }
}
export const call = (b, o) => raw(b, o)
let guarded = false
export async function guard() { if (guarded) return; const p = await call({ action: 'ping' }); if (p.sheetId !== TEST_ID || p.sheetId === LIVE_ID) { console.error('REFUSING: not TEST', p.sheetId); process.exit(9) } guarded = true; return p }
export const base = JSON.parse(fs.readFileSync('/workspace/sow-measure/baseline-snapshot.json'))
export const pull = () => call({ action: 'pull' })
export const iso = (ms = Date.now()) => new Date(ms).toISOString()
export const dateOf = (sid) => sid.split('|')[1]
export function summary(s) { return { sessions: s.sessions.length, tickRows: s.ticks.length, ticked: s.ticks.filter(t => t.set).length, roster: s.roster.length, subjects: s.subjects.length, sub: s.ticks.filter(t => t.sub || t.subOff).length, left: s.roster.filter(r => r.status === 'Left').length } }
export async function verifyBaseline() {
  const s = await pull(); const k = t => t.tickId + '|' + t.set
  const ids = x => x.map(k).sort().join()
  const sesKey = x => JSON.stringify(x.map(o => [o.sessionId, o.date, o.topic, o.status]))
  const r = { ticksIdSetEqual: ids(s.ticks) === ids(base.ticks), sessionsEqual: sesKey(s.sessions) === sesKey(base.sessions), rosterStatusEqual: JSON.stringify(s.roster.map(r => [r.classKey, r.roll, r.name, r.status])) === JSON.stringify(base.roster.map(r => [r.classKey, r.roll, r.name, r.status])), subjectsEqual: JSON.stringify(s.subjects) === JSON.stringify(base.subjects), ...summary(s) }
  r.ok = r.ticksIdSetEqual && r.sessionsEqual && r.rosterStatusEqual && r.subjectsEqual && r.sub === 0
  return r
}
/** Soft restore: delete non-baseline sessions, push baseline set / clear sub flags / roster status with a fresh stamp. */
export async function restore(tag = '') {
  const s = await pull()
  // bug-1 safe: stamp later than any (possibly poisoned future) stamp on the sheet, within the 10-min clamp
  const maxSt = Math.max(Date.now(), ...s.ticks.map(t => Date.parse(t.updatedAt) || 0), ...s.roster.map(r => Date.parse(r.updatedAt) || 0))
  if (maxSt > Date.now() + 9 * 60e3) throw new Error('poisoned stamp beyond clamp window ' + new Date(maxSt).toISOString())
  const now = iso(Math.max(Date.now() + 1000, maxSt + 1000))
  const bS = new Set(base.sessions.map(x => x.sessionId))
  const structs = s.sessions.filter(x => !bS.has(x.sessionId)).map(x => ({ kind: 'delete', subjectKey: x.subjectKey, date: x.date, at: now }))
  const bT = new Map(base.ticks.map(t => [t.tickId, t])); const sesDate = new Map(base.sessions.map(x => [x.sessionId, x]))
  const ticks = []
  for (const t of s.ticks) { const b = bT.get(t.tickId); if (!b) continue; if (b.set !== t.set || t.sub || t.subOff) { const se = sesDate.get(b.sessionId); ticks.push({ subjectKey: b.subjectKey, date: se.date, topic: se.topic, roll: b.roll, set: b.set, sub: false, subOff: false, updatedAt: now }) } }
  // baseline ticks missing from sheet
  const have = new Set(s.ticks.map(t => t.tickId))
  for (const b of base.ticks) if (!have.has(b.tickId)) { const se = sesDate.get(b.sessionId); ticks.push({ subjectKey: b.subjectKey, date: se.date, topic: se.topic, roll: b.roll, set: b.set, sub: false, subOff: false, updatedAt: now }) }
  const bR = new Map(base.roster.map(r => [r.classKey + '|' + r.roll, r]))
  const roster = s.roster.filter(r => bR.get(r.classKey + '|' + r.roll)?.status !== r.status).map(r => ({ classKey: r.classKey, roll: r.roll, status: bR.get(r.classKey + '|' + r.roll).status, updatedAt: now }))
  if (structs.length || ticks.length || roster.length) { const r = await call({ action: 'push', clientNow: iso(), structs, ticks, roster }); if (!r.ok) throw new Error('restore push failed ' + (r.error || r._nonJson)) }
  const v = await verifyBaseline(); log(`restore${tag ? ' ' + tag : ''}: structs ${structs.length} ticks ${ticks.length} roster ${roster.length} → ${JSON.stringify(v)}`)
  if (!v.ok) { log('RESTORE FAILED — STOP'); process.exit(42) }
  return v
}
