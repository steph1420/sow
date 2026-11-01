// Break-it browser probe (Steve t23u/t24u): beta.3 build vs TEST copy only. Real touch via CDP at 412x915.
// node tests/adv/browser-adv.cjs http://localhost:4179/sow/
const L = require('../e2e/_launch.cjs'); const url = process.argv[2] || 'http://localhost:4179/sow/'
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const SK = 'KGA_Eng_CW'; let lib; const res = []; let lastProg = Date.now()
const ok = (c, m, x = '') => { res.push([c ? 'PASS' : 'FAIL', m, x]); lib.log(`advB ${c ? 'PASS' : 'FAIL'} ${m}${x ? ' :: ' + x : ''}`); lastProg = Date.now() }
setInterval(() => { if (Date.now() - lastProg > 180000) { lib.log('advB: no progress 3 min — abort'); process.exit(7) } }, 20000)
async function device(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA })
  await L.betaInit(ctx); await ctx.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '1') } catch {} })
  const p = await ctx.newPage(); p.setDefaultTimeout(8000); const cdp = await ctx.newCDPSession(p)
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts })
  const tp = (x, y, id = 1) => ({ x, y, id, radiusX: 6, radiusY: 6, force: 1 })
  const d = { ctx, p, touch, tp }
  d.tap = async (x, y) => { await touch('touchStart', [tp(x, y)]); await p.waitForTimeout(40); await touch('touchEnd', []); await p.waitForTimeout(300) }
  d.cell = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => { const c = r.querySelectorAll('.sw-check-hit')[0].getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2] })
  d.on = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => r.querySelectorAll('.sw-check')[0].classList.contains('on'))
  d.tapRoll = async (roll) => { await p.locator(`.sw-row[data-roll="${roll}"]`).scrollIntoViewIfNeeded(); const [x, y] = await d.cell(roll); await d.tap(x, y) }
  d.list = () => p.goto(url + '#checklist/' + SK).then(() => p.waitForSelector('.sw-row[data-roll]')).then(() => p.waitForTimeout(500))
  d.rolls = () => p.$$eval('.sw-row[data-roll]', (rs) => rs.map((r) => +r.dataset.roll))
  d.dirty = async () => { await p.goto(url + '#settings/sync'); await p.waitForTimeout(600); return p.$$eval('.more-row', (els) => (els.find((e) => /Local dirty/.test(e.textContent)) || {}).textContent || '') }
  d.sync = async (wait = 90000) => { await p.goto(url + '#settings/sync'); await p.waitForFunction(() => document.querySelector('.sync-cta') && !document.querySelector('.sync-cta').disabled, null, { timeout: 30000 }); await L.dismissNudge(p); await p.click('.sync-cta'); await p.waitForTimeout(800); await p.waitForFunction(() => !document.querySelector('.sync-cta')?.disabled, null, { timeout: wait }).catch(() => {}); await p.waitForTimeout(500); return (await p.textContent('body')).replace(/\s+/g, ' ') }
  await L.setTestCopy(p, url); await d.sync(); return d
}
// which session is shown in column 1? the one whose sheet set matches app state best
async function sheetSet(rolls) { const s = await lib.pull(); const ses = s.sessions.filter((x) => x.subjectKey === SK).sort((a, b) => b.date.localeCompare(a.date)); return { s, ses } }
async function colSession(d) { const rolls = await d.rolls(); const st = {}; for (const r of rolls) st[r] = await d.on(r); const { s, ses } = await sheetSet(); let best = null, bs = -1
  for (const x of ses) { const m = rolls.filter((r) => (s.ticks.find((t) => t.tickId === `${x.sessionId}|${r}`)?.set || false) === st[r]).length; if (m > bs) { bs = m; best = x } }
  return { sid: best.sessionId, match: bs, of: rolls.length, st } }
async function agree(d, label) { await d.list(); const c = await colSession(d); const { s } = await sheetSet(); const bad = Object.keys(c.st).filter((r) => (s.ticks.find((t) => t.tickId === `${c.sid}|${r}`)?.set || false) !== c.st[r]); ok(c.match === c.of, `${label}: app column equals sheet session ${c.sid.split('|')[1]}`, `${c.match}/${c.of}${bad.length ? ' mismatch rolls ' + bad.map((r) => r + ' app=' + c.st[r]) : ''}`); return c }
const pushOnly = (fn) => async (route) => { const b = route.request().postData() || ''; if (/"action":"push"/.test(b)) return fn(route); return route.continue() }
async function T(name, fn) { if (process.env.ADV_GROUPS && !process.env.ADV_GROUPS.split(',').includes(name)) return; lib.log('advB group ' + name); try { await fn() } catch (e) { ok(false, name + ' threw', e.message.split('\n')[0]) } try { await lib.restore('after ' + name) } catch (e) { lib.log('RESTORE FAILED ' + e.message); process.exit(42) } }
;(async () => {
  lib = await import('./bridgeLib.mjs'); await lib.guard(); const v0 = await lib.verifyBaseline(); if (!v0.ok) { lib.log('advB baseline not ok at start'); process.exit(42) }
  const b = await L.chromium.launch({ ...L.launchOpts, args: ['--no-sandbox'] })
  const EX = '**/macros/s/**'
  await T('malformed-responses', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); const r1 = rolls[2], r2 = rolls[3]
    const before = [await d.on(r1), await d.on(r2)]; await d.tapRoll(r1); await d.tapRoll(r2)
    const bodies = [['HTML login page', { status: 200, contentType: 'text/html', body: '<html><body>Sign in</body></html>' }], ['HTTP 500', { status: 500, body: 'oops' }],
      ['truncated JSON', { status: 200, contentType: 'application/json', body: '{"ok":tr' }], ['ok:true with no counts', { status: 200, contentType: 'application/json', body: '{"ok":true}' }],
      ['ok:false error', { status: 200, contentType: 'application/json', body: '{"ok":false,"error":"Exception: Service invoked too many times"}' }], ['empty body', { status: 200, body: '' }],
      ['wrong types', { status: 200, contentType: 'application/json', body: '{"ok":true,"applied":"x","rejected":"nope","ignored":null}' }]]
    for (const [lbl, resp] of bodies) {
      await d.p.route(EX, pushOnly((r) => r.fulfill(resp))); const txt = await d.sync(20000); await d.p.unroute(EX)
      const alive = await d.p.$('.sync-cta') !== null; const dirty = await d.dirty(); await d.list()
      ok(alive && (await d.on(r1)) !== before[0] && (await d.on(r2)) !== before[1], `bad push reply "${lbl}": app alive, local ticks kept`, `dirty ${dirty.replace('Local dirty', '').trim()} · ${(txt.match(/(error|fail|could not|couldn.t)[^.]{0,60}/i) || ['no error text'])[0]}`)
    }
    await d.sync(); await agree(d, 'after malformed replies, a real sync'); await d.ctx.close()
  })
  await T('network-flap', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); await d.tapRoll(rolls[4]); await d.tapRoll(rolls[5])
    await d.p.route(EX, pushOnly((r) => r.abort('connectionreset'))); await d.sync(20000); await d.p.unroute(EX)
    await d.ctx.setOffline(true); await d.list(); await d.tapRoll(rolls[6]); await d.ctx.setOffline(false); await d.ctx.setOffline(true); await d.ctx.setOffline(false)
    await d.sync(); await agree(d, 'network reset + offline flaps then sync'); await d.ctx.close()
  })
  await T('tick-storm-during-push', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); await d.tapRoll(rolls[1])
    await d.p.route(EX, pushOnly(async (r) => { await new Promise((z) => setTimeout(z, 6000)); await r.continue() }))
    await d.p.goto(url + '#settings/sync'); await d.p.waitForFunction(() => !document.querySelector('.sync-cta')?.disabled); await d.p.click('.sync-cta')
    await d.p.evaluate((sk) => { location.hash = '#checklist/' + sk }, SK); await d.p.waitForSelector('.sw-row[data-roll]')
    for (const r of rolls.slice(2, 10)) await d.tapRoll(r); await d.tapRoll(rolls[2]) // and flip one back
    await d.p.waitForTimeout(8000); await d.p.unroute(EX); await d.sync(); await d.sync(); await agree(d, '9 taps during a slow push, then sync ×2'); await d.ctx.close()
  })
  await T('reload-mid-push', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); await d.tapRoll(rolls[7]); const want = await d.on(rolls[7])
    await d.p.route(EX, pushOnly(async (r) => { await new Promise((z) => setTimeout(z, 5000)); await r.continue().catch(() => {}) }))
    await d.p.goto(url + '#settings/sync'); await d.p.waitForFunction(() => !document.querySelector('.sync-cta')?.disabled); await d.p.click('.sync-cta'); await d.p.waitForTimeout(1500)
    await d.p.reload({ waitUntil: 'load' }); await d.p.unroute(EX); await d.p.waitForTimeout(6000); await d.list()
    ok((await d.on(rolls[7])) === want, 'reload during push: local tick survives reload')
    await d.sync(); await agree(d, 'reload during push, then sync'); await d.ctx.close()
  })
  await T('two-devices-offline', async () => {
    const A = await device(b), B = await device(b); await A.list(); await B.list(); const rolls = await A.rolls(); const [x, y, z] = [rolls[8], rolls[9], rolls[10]]
    await A.ctx.setOffline(true); await B.ctx.setOffline(true)
    await A.tapRoll(x); await A.tapRoll(y); await A.p.waitForTimeout(1500); await B.tapRoll(x); await B.tapRoll(x); await B.tapRoll(z) // B toggles x twice (later = original)
    const xOrig = await B.on(x); await A.ctx.setOffline(false); await B.ctx.setOffline(false)
    await A.sync(); await B.sync(); await A.sync()
    for (const [d, n] of [[A, 'A'], [B, 'B']]) { await d.list(); ok((await d.on(x)) === xOrig, `device ${n}: cell both edited offline converges to the later edit (B)`) ; await agree(d, `device ${n} after offline merge`) }
    await A.ctx.close(); await B.ctx.close()
  })
  await T('snapshot-restore-then-sync', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); const r = rolls[11]; const o = await d.on(r)
    await d.p.goto(url + '#settings'); await d.p.click('.bk-now'); await d.p.waitForTimeout(1500)
    await d.list(); await d.tapRoll(r); await d.sync() // sheet now has the change
    await d.p.goto(url + '#settings'); await d.p.waitForSelector('.bk-go'); await d.p.locator('.bk-row', { hasText: 'Back up now' }).first().locator('.bk-go').click(); await d.p.click('.bk-amber'); await d.p.waitForTimeout(2500)
    await d.list(); ok((await d.on(r)) === o, 'restore snapshot: local cell back to snapshot value')
    await d.sync(); await d.list(); const after = await d.on(r)
    const c = await agree(d, 'restore then sync: app and sheet agree'); lib.log(`advB note: after restore+sync cell is ${after === o ? 'snapshot value (restore pushed)' : 'sheet value (restore overwritten by newer sheet)'}`)
    // reload mid-snapshot restore
    await d.p.goto(url + '#settings'); await d.p.locator('.bk-go').first().click(); await d.p.click('.bk-amber'); await d.p.waitForTimeout(150); await d.p.reload({ waitUntil: 'load' }); await d.p.waitForTimeout(1500)
    await d.list(); ok((await d.rolls()).length === c.of, 'reload in the middle of a snapshot restore: list intact', `${(await d.rolls()).length}/${c.of}`)
    await d.sync(); await agree(d, 'after interrupted restore, sync'); await d.ctx.close()
  })
  await T('swipe-and-submitted-edges', async () => {
    const d = await device(b); await d.list(); const rolls = await d.rolls(); const rs = rolls.slice(1, 5); const st0 = []; for (const r of rs) st0.push(await d.on(r))
    const pts = []; for (const r of rs) pts.push(await d.cell(r))
    await d.touch('touchStart', [d.tp(...pts[0])]); for (let i = 1; i < pts.length; i++) { await d.p.waitForTimeout(60); await d.touch('touchMove', [d.tp(...pts[i])]) } await d.touch('touchCancel', []); await d.p.waitForTimeout(400)
    const st1 = []; for (const r of rs) st1.push(await d.on(r)); ok(JSON.stringify(st1) === JSON.stringify(st0), 'swipe ended by touchcancel (call/notification) commits nothing')
    await d.touch('touchStart', [d.tp(...pts[0])]); await d.p.waitForTimeout(60); await d.touch('touchMove', [d.tp(...pts[1])]); await d.touch('touchMove', [d.tp(...pts[1]), d.tp(200, 100, 2)]); await d.touch('touchMove', [d.tp(...pts[2]), d.tp(220, 120, 2)]); await d.touch('touchEnd', []); await d.p.waitForTimeout(400)
    const st2 = []; for (const r of rs) st2.push(await d.on(r)); ok(true, 'second finger mid-swipe: no crash', `before ${st0} after ${st2}`)
    await d.touch('touchStart', [d.tp(...pts[0])]); await d.touch('touchMove', [d.tp(pts[0][0], 2000)]); await d.touch('touchMove', [d.tp(-50, -50)]); await d.touch('touchEnd', []); await d.p.waitForTimeout(400)
    ok((await d.p.$('.sw-row')) !== null, 'swipe dragged off-screen: app alive')
    // Submitted Undo then reload: undone (auto) state persists
    const onR = []; for (const r of rolls) if (await d.on(r)) onR.push(r)
    if (onR.length) { const r = onR[0]; await d.p.focus(`.sw-row[data-roll="${r}"] .sw-check-hit`); await d.p.keyboard.press('m'); await d.p.waitForTimeout(300)
      const lk = () => d.p.$eval(`.sw-row[data-roll="${r}"]`, (e) => { const c = e.querySelectorAll('.sw-check')[0]; return { on: c.classList.contains('on'), derived: c.classList.contains('derived') } })
      const s0 = await lk(); await d.tapRoll(r); const s1 = await lk(); const u = await d.p.$('button:has-text("Undo")'); if (u) { const bb = await u.boundingBox(); await d.tap(bb.x + bb.width / 2, bb.y + bb.height / 2) }
      const subMode = async () => { await d.p.focus(`.sw-row[data-roll="${r}"] .sw-check-hit`); await d.p.keyboard.press('m'); await d.p.waitForTimeout(300) }
      const s2 = await lk(); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForTimeout(800); await subMode(); const s3 = await lk() // mode resets to Set on reload (by design)
      ok(s0.derived && !s1.on && s2.on && s2.derived && s3.on && s3.derived, 'Submitted: tap auto → off → Undo → reload keeps auto', JSON.stringify([s0, s1, s2, s3]))
      await d.tapRoll(r); await d.p.waitForTimeout(5000); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForTimeout(800); await subMode(); const s4 = await lk(); ok(!s4.on, 'Submitted: auto unticked (toast expired) survives reload', JSON.stringify(s4))
      await d.sync(); const s = await lib.pull(); ok(s.ticks.some((t) => t.subOff), 'manual-off Submitted reached the sheet (J FALSE)')
    }
    await d.ctx.close()
  })
  await b.close(); const v = await lib.verifyBaseline(); const f = res.filter((r) => r[0] === 'FAIL').length
  lib.log(`advB done ${res.length - f} pass ${f} fail; baseline ${v.ok}`); console.log(JSON.stringify(res)); process.exit(0)
})().catch((e) => { lib?.log('advB error ' + e.message); process.exit(2) })
