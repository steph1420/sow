// Adversarial real-bridge tests on the TEST copy (Steve t23u). Restores + verifies baseline after each destructive group.
// node tests/adv/bridge-adversarial.mjs   (needs SOW_TEST_BRIDGE_TOKEN)
import { call, raw, guard, pull, iso, restore, verifyBaseline, log, base, summary } from './bridgeLib.mjs'
const res = []; let lastProg = Date.now()
const ok = (c, m) => { res.push([c ? 'PASS' : 'FAIL', m]); console.log((c ? 'PASS ' : 'FAIL ') + m); lastProg = Date.now() }
const wd = setInterval(() => { if (Date.now() - lastProg > 180000) { log('adv bridge: no progress 3 min — abort'); process.exit(7) } }, 20000)
const H = 3600e3, D = 24 * H
const S = { subjectKey: 'KGA_Eng_CW' }
const SCR = '2026-12-25' // scratch session, deleted by restore
const tickOf = (s, sk, date, roll) => s.ticks.find(t => t.tickId === `${sk}|${date}|${roll}`)
async function main() {
  const p = await guard(); log(`adv bridge start, bridge ${p.version}`); ok(p.version === '0.46.1', 'ping version 0.46.1 on TEST sheet')
  const v0 = await verifyBaseline(); ok(v0.ok, 'baseline at start ' + JSON.stringify(v0)); if (!v0.ok) return
  const b0 = base.ticks.find(t => t.subjectKey === 'KGA_Eng_CW' && t.set === false)
  const bDate = b0.sessionId.split('|')[1], roll = b0.roll

  // ── auth / malformed
  ok((await call({ action: 'pull' }, { token: 'nope' })).error === 'bad token', 'bad token rejected (pull)')
  ok((await call({ action: 'push', ticks: [{ ...S, date: bDate, roll, set: true, updatedAt: iso() }] }, { token: '' })).error === 'bad token', 'bad token rejected (push), no write')
  const nj = await raw({}, { text: 'not json{' }); ok(nj.ok === false || nj._nonJson !== undefined, 'non-JSON body handled: ' + JSON.stringify(nj).slice(0, 80))
  ok((await call({ action: 'frobnicate' })).error === 'unknown action', 'unknown action rejected')
  const bad = await call({ action: 'push', clientNow: iso(), ticks: [
    { ...S, date: 'yesterday', roll, set: true, updatedAt: iso() }, { ...S, date: SCR, roll: 0, set: true, updatedAt: iso() },
    { ...S, date: SCR, roll: -3, set: true, updatedAt: iso() }, { ...S, date: SCR, roll: 'x', set: true, updatedAt: iso() },
    { subjectKey: 'ZZ_Math', date: SCR, roll: 1, set: true, updatedAt: iso() }, { ...S, date: SCR, roll: 1, set: true } ] })
  ok(bad.ok && bad.applied === 0 && bad.rejected.length === 6, `garbage ticks all rejected (${bad.rejected.length}/6, applied ${bad.applied})`)
  const s1 = await pull(); ok(summary(s1).tickRows === 311 && summary(s1).sessions === 7, 'no rows/sessions created by garbage')
  const ros = await call({ action: 'push', clientNow: iso(), roster: [{ classKey: 'KGA', roll: 999, status: 'Left', updatedAt: iso() }] })
  ok(ros.rejected?.length === 1 && ros.applied === 0, 'roster op for unknown pupil rejected (never invent pupils)')

  // ── invalid calendar date (Feb 30) — does the bridge roll it over?
  const feb = await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: '2027-02-30', topic: 'adv', roll: 1, set: true, updatedAt: iso() }] })
  const sf = await pull(); const rolled = sf.sessions.find(x => x.date === '2027-03-02' && x.subjectKey === 'KGA_Eng_CW')
  ok(!rolled, `invalid date 2027-02-30 not rolled into 2 Mar (applied ${feb.applied}, rejected ${feb.rejected?.length})`)
  await restore('after Feb-30')

  // ── two devices same cell, both orders (newer stamp wins regardless of arrival order)
  for (const order of ['AB', 'BA']) {
    const tA = iso(Date.now() - 60000), tB = iso(Date.now() - 30000) // B edited later
    const opA = { ...S, date: bDate, roll, set: true, updatedAt: tA }, opB = { ...S, date: bDate, roll, set: false, updatedAt: tB }
    const first = order === 'AB' ? opA : opB, second = order === 'AB' ? opB : opA
    await call({ action: 'push', clientNow: iso(), ticks: [first] }); await call({ action: 'push', clientNow: iso(), ticks: [second] })
    const t = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll); ok(t.set === false, `two devices ${order}: newer edit (B=untick) wins`)
  }
  // ── offline device with older edit reconnecting after a newer one → ignored
  const tOld = iso(Date.now() - 2 * H)
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso(Date.now() - 1000) }] })
  const ro = await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: true, updatedAt: tOld }] })
  ok(ro.ignored === 1 && tickOf(await pull(), 'KGA_Eng_CW', bDate, roll).set === false, 'offline op from 2 h ago loses to the newer sheet value')

  // ── clock skew: phone −2h, −1d (slow) must still beat an edit made a minute ago on a correct phone
  for (const [lbl, skew] of [['-2h', -2 * H], ['-1d', -D], ['+2h', 2 * H], ['+1d', D]]) {
    const realNow = Date.now()
    await call({ action: 'push', clientNow: iso(realNow), ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso(realNow - 60000) }] })
    const phoneNow = realNow + skew
    const r = await call({ action: 'push', clientNow: iso(phoneNow), ticks: [{ ...S, date: bDate, roll, set: true, updatedAt: iso(phoneNow - 1000) }] })
    const t = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll)
    ok(t.set === true && Math.abs(Date.parse(t.updatedAt) - realNow) < 120000, `clock ${lbl}: newer real edit wins, stamp corrected (offset ${Math.round((r.offsetMs || 0) / 60000)} min)`)
    // and a later correct-clock edit still beats the skewed one
    const r2 = await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso() }] })
    ok(r2.applied === 1, `clock ${lbl}: following correct-clock edit still applies (no poisoned future stamp)`)
  }
  // old app (no clientNow) with phone +1 day: clamp keeps it from poisoning the cell
  await call({ action: 'push', ticks: [{ ...S, date: bDate, roll, set: true, updatedAt: iso(Date.now() + D) }] })
  const r3 = await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso(Date.now() + 2000) }] })
  ok(r3.applied === 1, '0.44-style push with +1d stamp is clamped; next real edit still wins')

  // ── duplicate / replayed / concurrent requests
  const op = { ...S, date: bDate, roll, set: true, updatedAt: iso() }
  const [d1, d2, d3] = await Promise.all([1, 2, 3].map(() => call({ action: 'push', clientNow: iso(), ticks: [op] })))
  ok([d1, d2, d3].every(x => x.ok) && [d1, d2, d3].reduce((a, x) => a + x.applied, 0) === 1, `3 concurrent duplicate pushes: applied exactly once (${[d1, d2, d3].map(x => x.applied)})`)
  const rp = await call({ action: 'push', clientNow: iso(Date.now() - 5 * 60000), ticks: [op] })
  ok(rp.applied === 0 || tickOf(await pull(), 'KGA_Eng_CW', bDate, roll).set === true, `replayed op with a different clientNow (−5 min): applied ${rp.applied}`)
  const s2 = await pull(); ok(s2.ticks.filter(t => t.tickId === `KGA_Eng_CW|${bDate}|${roll}`).length === 1, 'no duplicate tick rows after concurrent pushes')

  // ── 0.44-style push keeps manual Submitted (J)
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: true, sub: true, updatedAt: iso() }] })
  await call({ action: 'push', ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso(Date.now() + 1000) }] })
  let t4 = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll); ok(t4.sub === true && t4.set === false, 'old-style push (no sub) keeps manual Submitted on the sheet')
  // subOff only while Set on
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: bDate, roll, set: true, sub: false, subOff: true, updatedAt: iso(Date.now() + 2000) }] })
  t4 = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll); ok(t4.subOff === true && !t4.sub, 'subOff stored while Set on')
  await call({ action: 'push', ticks: [{ ...S, date: bDate, roll, set: false, updatedAt: iso(Date.now() + 3000) }] })
  t4 = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll); ok(!t4.subOff && !t4.sub, 'subOff cleared when Set goes off (old-style push)')
  // subs (migration op) only turns J on, never touches Set
  await call({ action: 'push', clientNow: iso(), subs: [{ ...S, date: bDate, roll, updatedAt: iso() }] })
  t4 = tickOf(await pull(), 'KGA_Eng_CW', bDate, roll); ok(t4.sub === true && t4.set === false, 'subs migration op sets J only')
  await restore('after cell tests')

  // ── Left on two devices
  const pr = base.roster.find(r => r.classKey === 'KGB' && r.status === 'Active')
  const lA = iso(Date.now() - 20000), lB = iso(Date.now() - 10000)
  await call({ action: 'push', clientNow: iso(), roster: [{ classKey: 'KGB', roll: pr.roll, status: 'Active', updatedAt: lB }] })
  await call({ action: 'push', clientNow: iso(), roster: [{ classKey: 'KGB', roll: pr.roll, status: 'Left', updatedAt: lA }] })
  let rr = (await pull()).roster.find(r => r.classKey === 'KGB' && r.roll === pr.roll); ok(rr.status === 'Active', 'Left on two devices: newer (Active) wins even when the older Left arrives last')
  await call({ action: 'push', clientNow: iso(Date.now() - D), roster: [{ classKey: 'KGB', roll: pr.roll, status: 'Left', updatedAt: iso(Date.now() - D) }] })
  rr = (await pull()).roster.find(r => r.classKey === 'KGB' && r.roll === pr.roll); ok(rr.status === 'Left', 'Left from a phone 1 day slow still wins (clock fix applies to roster)')
  await restore('after Left')

  // ── scratch session: unicode/huge topic, year wrap, phantom rolls, rename while other device ticks, delete while ticking
  const big = 'टॉपिक 🧪 "quotes", commas\nnewline ' + 'x'.repeat(500)
  await call({ action: 'push', clientNow: iso(), sessions: [{ ...S, date: SCR, topic: big, updatedAt: iso() }] })
  let ss = (await pull()).sessions.find(x => x.sessionId === `KGA_Eng_CW|${SCR}`)
  ok(ss && ss.topic === big.slice(0, 200), 'unicode/emoji/quote/newline topic round-trips, capped at 200')
  const ph = await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: SCR, roll: 999, set: true, updatedAt: iso() }] })
  ok(ph.applied === 0, `tick for a roll not in the Roster (999) is rejected (applied ${ph.applied})`)
  for (const [d, lbl] of [['2027-03-31', '31 Mar'], ['2027-04-01', '1 Apr']]) {
    await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: d, topic: 'wrap', roll: 2, set: true, updatedAt: iso() }] })
    ok(!!(await pull()).sessions.find(x => x.sessionId === `KGA_Eng_CW|${d}` && x.date === d), `year wrap: ${lbl} session keeps its year`)
  }
  // rename SCR → 2026-12-26 while another device (offline) ticks SCR with an older stamp
  const tick0 = iso(Date.now() - 30000)
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: SCR, topic: 't', roll: 3, set: true, updatedAt: iso(Date.now() - 60000) }] })
  const rn = await call({ action: 'push', clientNow: iso(), structs: [{ kind: 'rename', subjectKey: 'KGA_Eng_CW', from: SCR, to: '2026-12-26', at: iso() }] })
  ok(rn.structApplied === 1, 'rename scratch date applied')
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: SCR, topic: 't', roll: 4, set: true, updatedAt: tick0 }] })
  let st = await pull(); ok(!st.sessions.find(x => x.sessionId === `KGA_Eng_CW|${SCR}`), 'older tick from other device does not resurrect the renamed-away date')
  ok(!!tickOf(st, 'KGA_Eng_CW', '2026-12-26', 3)?.set, 'tick moved with the rename')
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: SCR, topic: 't', roll: 5, set: true, updatedAt: iso(Date.now() + 1000) }] })
  st = await pull(); ok(!!st.sessions.find(x => x.sessionId === `KGA_Eng_CW|${SCR}`), 'a tick made after the rename (newer than tombstone) re-creates the date (documented: Undo after Sync)')
  const rn2 = await call({ action: 'push', clientNow: iso(), structs: [{ kind: 'rename', subjectKey: 'KGA_Eng_CW', from: SCR, to: '2026-12-26', at: iso() }] })
  ok(rn2.rejected.length === 1, 'rename onto an existing date is rejected, not merged')
  const dl = await call({ action: 'push', clientNow: iso(), structs: [{ kind: 'delete', subjectKey: 'KGA_Eng_CW', date: '2026-12-26', at: iso() }] })
  await call({ action: 'push', clientNow: iso(), ticks: [{ ...S, date: '2026-12-26', topic: 't', roll: 6, set: true, updatedAt: iso(Date.now() - 5000) }] })
  ok(!(await pull()).sessions.find(x => x.sessionId === 'KGA_Eng_CW|2026-12-26'), 'delete while other device ticks (older stamp): stays deleted')
  const dl2 = await call({ action: 'push', clientNow: iso(), structs: [{ kind: 'delete', subjectKey: 'KGA_Eng_CW', date: '2026-12-26', at: iso() }] })
  ok(dl.ok && dl2.ok && dl2.structApplied === 1, 'replayed delete is idempotent')
  await restore('after scratch sessions')

  // ── huge push (all baseline ticks resent with own stamps → all ignored, nothing written)
  const sesBy = new Map(base.sessions.map(x => [x.sessionId, x]))
  const all = (await pull()).ticks.map(t => ({ subjectKey: t.subjectKey, date: sesBy.get(t.sessionId).date, topic: sesBy.get(t.sessionId).topic, roll: t.roll, set: t.set, updatedAt: t.updatedAt }))
  const t0 = Date.now(); const hp = await call({ action: 'push', clientNow: iso(), ticks: all })
  ok(hp.applied === 0 && hp.ignored === all.length, `resend of all ${all.length} ticks with their own stamps: all ignored (${Date.now() - t0} ms)`)
  ok((await verifyBaseline()).ok, 'baseline intact after huge no-op push')
  // malformed old bridge response is a client concern → covered by unit test bridge.adv.test.ts
}
main().then(async () => { await restore('final').catch(e => { log('restore error ' + e.message); process.exit(42) }); clearInterval(wd)
  const f = res.filter(r => r[0] === 'FAIL').length; log(`adv bridge done ${res.length - f} pass ${f} fail`); process.exit(f ? 1 : 0) })
  .catch(async e => { log('adv bridge error ' + e.message); try { await restore('after error') } catch (x) { log('RESTORE FAILED ' + x.message); process.exit(42) } process.exit(2) })
