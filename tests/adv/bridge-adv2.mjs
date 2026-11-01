// Break-it run 2 (Steve t23u/t24u). TEST only. Bugs are logged, not stop reasons; restore+verify after each group.
import { call, guard, pull, iso, restore, verifyBaseline, log, base, summary } from './bridgeLib.mjs'
const res = []; let lastProg = Date.now()
const ok = (c, m, extra = '') => { res.push([c ? 'PASS' : 'FAIL', m, extra]); log(`adv2 ${c ? 'PASS' : 'FAIL'} ${m}${extra ? ' :: ' + extra : ''}`); lastProg = Date.now() }
const wd = setInterval(() => { if (Date.now() - lastProg > 180000) { log('adv2: no progress 3 min — abort'); process.exit(7) } }, 20000)
const SK = 'KGA_Eng_CW', A = '2026-12-25', B = '2026-12-26'
const P = (o) => call({ action: 'push', clientNow: iso(), ...o })
const tk = (date, roll, set, at, x = {}) => ({ subjectKey: SK, date, topic: 'adv', roll, set, updatedAt: at, ...x })
const find = (s, date, roll) => s.ticks.find(t => t.tickId === `${SK}|${date}|${roll}`)
const ses = (s, date, sk = SK) => s.sessions.find(x => x.sessionId === `${sk}|${date}`)
async function group(name, fn) { try { await fn() } catch (e) { ok(false, name + ' threw', e.message) } await restore('after ' + name) }
async function main() {
  const p = await guard(); ok(p.version === '0.46.1', 'ping 0.46.1 on TEST'); const v0 = await verifyBaseline(); ok(v0.ok, 'baseline at start'); if (!v0.ok) return
  const act = base.roster.find(r => r.classKey === 'KGA' && r.status === 'Active')
  await group('left-two-devices', async () => {
    for (const ord of ['AB', 'BA']) {
      const a = { classKey: 'KGA', roll: act.roll, status: 'Left', updatedAt: iso(Date.now() - 60000) }, b = { ...a, status: 'Active', updatedAt: iso(Date.now() - 30000) }
      await P({ roster: [ord === 'AB' ? a : b] }); await P({ roster: [ord === 'AB' ? b : a] })
      const r = (await pull()).roster.find(x => x.classKey === 'KGA' && x.roll === act.roll); ok(r.status === 'Active', `Left on two devices ${ord}: newer (Active) wins`)
    }
    const now = Date.now(); await P({ roster: [{ classKey: 'KGA', roll: act.roll, status: 'Left', updatedAt: iso(now - 1000) }] })
    const r2 = await call({ action: 'push', clientNow: iso(now + 86400e3), roster: [{ classKey: 'KGA', roll: act.roll, status: 'Active', updatedAt: iso(now + 86400e3 - 500) }] })
    const r = (await pull()).roster.find(x => x.classKey === 'KGA' && x.roll === act.roll); ok(r.status === 'Active' && Math.abs(Date.parse(r.updatedAt) - now) < 120000, 'Left/Active from a +1d phone: applied with corrected stamp', `stamp ${r.updatedAt} off ${r2.offsetMs}`)
    const rr = await P({ roster: [{ classKey: 'KGA', roll: act.roll, status: 'Gone', updatedAt: iso() }] }); const r3 = (await pull()).roster.find(x => x.classKey === 'KGA' && x.roll === act.roll)
    ok(r3.status === 'Active', 'unknown status "Gone" does not mark Left', `applied ${rr.applied}`)
  })
  await group('unicode-huge-topic', async () => {
    const uni = 'संख्या 🧮 עברית — “quotes” \u200d👩‍🏫 ' + 'x'.repeat(5000)
    await P({ sessions: [{ subjectKey: SK, date: A, topic: uni, updatedAt: iso() }] })
    const t = ses(await pull(), A)?.topic || ''; ok(t.length <= 200 && t.startsWith('संख्या 🧮 עברית'), 'unicode+5000-char topic stored, clipped to ≤200, script intact', `len ${t.length}`)
    const lone = t.slice(-1).charCodeAt(0); ok(!(lone >= 0xD800 && lone <= 0xDBFF), 'clip does not leave a broken half-emoji', `last code ${lone.toString(16)}`)
    for (const inj of ['=1+1', '+2+3', '@SUM(1)', "'=quoted"]) {
      await P({ sessions: [{ subjectKey: SK, date: A, topic: inj, updatedAt: iso() }] }); const got = ses(await pull(), A)?.topic
      ok(got === inj, `topic "${inj}" stored as literal text (no formula injection)`, `got ${JSON.stringify(got)}`)
    }
    const r = await P({ sessions: [{ subjectKey: SK, date: A, topic: null, updatedAt: iso() }, { subjectKey: SK, date: A, topic: { a: 1 }, updatedAt: iso(Date.now() + 1) }] })
    ok(r.ok !== false, 'null/object topic does not crash push', JSON.stringify(ses(await pull(), A)?.topic))
  })
  await group('phantom-rolls', async () => {
    const r = await P({ ticks: [tk(A, 999, true, iso()), tk(A, 1.5, true, iso()), tk(A, 1e9, true, iso()), tk(A, '7', true, iso())] })
    const s = await pull(); const made = s.ticks.filter(t => t.sessionId === `${SK}|${A}`).map(t => t.roll)
    ok(!made.includes(999), 'tick for phantom roll 999 (not in Roster) rejected', `applied ${r.applied}, rolls ${made}`)
    ok(!made.includes(1.5), 'fractional roll 1.5 rejected', `rolls ${made}`)
    ok(!made.includes(1e9), 'roll 1e9 rejected', `rolls ${made}`)
    ok(made.includes(7), 'roll "7" as string accepted as 7')
  })
  await group('year-wrap', async () => {
    const r = await P({ ticks: [tk('2027-03-31', 1, true, iso()), tk('2027-04-01', 1, true, iso()), tk('2026-12-31', 1, true, iso()), tk('2027-01-01', 1, true, iso())] })
    const s = await pull(); const ds = ['2027-03-31', '2027-04-01', '2026-12-31', '2027-01-01']
    ok(ds.every(d => ses(s, d)?.date === d && find(s, d, 1)?.set), '31 Mar / 1 Apr / 31 Dec / 1 Jan land on their exact dates', `applied ${r.applied}`)
    const r2 = await P({ ticks: [tk('2027-04-31', 1, true, iso()), tk('2026-13-01', 1, true, iso()), tk('2027-00-10', 1, true, iso())] })
    const s2 = await pull(); ok(!ses(s2, '2027-05-01') && !ses(s2, '2027-01-01', SK + 'x') && r2.applied === 0, 'non-existent dates 31 Apr / month 13 / month 0 rejected (bug 2 family)', `applied ${r2.applied} rejected ${r2.rejected?.length}`)
  })
  await group('rename-vs-tick', async () => {
    await P({ ticks: [tk(A, 1, true, iso(Date.now() - 5000))] })
    const tR = Date.now(); const rn = await P({ structs: [{ kind: 'rename', subjectKey: SK, from: A, to: B, at: iso(tR) }] })
    let s = await pull(); ok(!ses(s, A) && find(s, B, 1)?.set, 'rename moves session and its ticks', `done ${rn.structApplied}`)
    const r1 = await P({ ticks: [tk(A, 2, true, iso(tR - 60000))] }); s = await pull()
    ok(!ses(s, A) && r1.ignored === 1, 'other device ticking old date with older stamp: ignored, old session not resurrected')
    const r2 = await P({ ticks: [tk(A, 3, true, iso(tR + 2000))] }); s = await pull()
    ok(ses(s, A) && find(s, A, 3), 'tick on old date stamped after rename recreates it (documented Undo-after-sync rule)', 'by design; may surprise: a phone that never got the rename will split the session')
    const r3 = await P({ structs: [{ kind: 'rename', subjectKey: SK, from: B, to: A, at: iso() }] })
    ok(r3.rejected?.length === 1 && ses(await pull(), B), 'rename onto a date that already has a session is rejected, nothing lost')
    const tD = Date.now(); await P({ structs: [{ kind: 'delete', subjectKey: SK, date: B, at: iso(tD) }] })
    const r4 = await P({ ticks: [tk(B, 4, true, iso(tD - 30000))], sessions: [{ subjectKey: SK, date: B, topic: 'late', updatedAt: iso(tD - 30000) }] }); s = await pull()
    ok(!ses(s, B), 'delete vs older tick+topic from other device: stays deleted', `ignored ${r4.ignored}`)
    const r5 = await P({ structs: [{ kind: 'rename', subjectKey: SK, from: '2026-02-30', to: A, at: iso() }, { kind: 'delete', subjectKey: SK, date: '2027-02-29', at: iso() }] })
    ok((r5.rejected || []).length === 2, 'rename/delete with impossible dates rejected (bug 2 family)', `rejected ${r5.rejected?.length} done ${r5.structApplied}`)
    // same push: rename + tick to new date + delete in one batch
    const r6 = await P({ structs: [{ kind: 'rename', subjectKey: SK, from: A, to: B, at: iso() }], ticks: [tk(B, 5, true, iso(Date.now() + 1000))] }); s = await pull()
    ok(ses(s, B) && find(s, B, 3) && find(s, B, 5) && !ses(s, A), 'rename + tick on new date in one push both land')
  })
  await group('rename-baseline-and-back', async () => {
    const bs = base.sessions.find(x => x.subjectKey === SK); const n0 = base.ticks.filter(t => t.sessionId === bs.sessionId).length
    await P({ structs: [{ kind: 'rename', subjectKey: SK, from: bs.date, to: A, at: iso() }] })
    await P({ structs: [{ kind: 'rename', subjectKey: SK, from: A, to: bs.date, at: iso(Date.now() + 1000) }] })
    const s = await pull(); const n1 = s.ticks.filter(t => t.sessionId === bs.sessionId).length
    ok(n1 === n0 && ses(s, bs.date)?.topic === bs.topic, 'rename a real session away and back: ticks and topic intact', `${n1}/${n0}`)
    const v = await verifyBaseline(); ok(v.ticksIdSetEqual, 'tick sets equal baseline after round-trip rename (sub flags/pupilStatus rows move with rows)')
  })
  await group('resend-all', async () => {
    const s = await pull(); const sb = new Map(s.sessions.map(x => [x.sessionId, x]))
    const all = s.ticks.map(t => ({ subjectKey: t.subjectKey, date: sb.get(t.sessionId).date, topic: sb.get(t.sessionId).topic, roll: t.roll, set: t.set, updatedAt: t.updatedAt }))
    const t0 = Date.now(); const r = await P({ ticks: all }); ok(r.applied === 0 && r.ignored === all.length, `resend all ${all.length} ticks with own stamps: all ignored`, `${Date.now() - t0} ms`)
    const t1 = Date.now(); const r2 = await P({ ticks: all.map(x => ({ ...x, updatedAt: iso() })) }); ok(r2.applied === all.length && (await verifyBaseline()).ticksIdSetEqual, `resend all ${all.length} with fresh stamps: applied, values unchanged`, `${Date.now() - t1} ms`)
  })
}
main().then(async () => { await restore('final'); clearInterval(wd); const f = res.filter(r => r[0] === 'FAIL'); log(`adv2 done ${res.length - f.length} pass ${f.length} fail`); console.log(JSON.stringify(res)); process.exit(0) })
  .catch(async e => { log('adv2 error ' + e.message); try { await restore('after error') } catch (x) { log('RESTORE FAILED ' + x.message); process.exit(42) } process.exit(2) })
