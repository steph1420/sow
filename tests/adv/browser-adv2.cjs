// Break-it browser probe 2 (Steve t29u): grip (Q-AZ-1 B), directional wash (t23u) and new adversarial cases.
// Demo-data groups need no sheet; TEST groups sync the TEST copy and restore it. node tests/adv/browser-adv2.cjs <url>
const L = require('../e2e/_launch.cjs'); const url = process.argv[2] || 'http://localhost:4179/sow/'
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
let lib; const res = []; let lastProg = Date.now()
const ok = (c, m, x = '') => { res.push([c ? 'PASS' : 'FAIL', m, x]); lib.log(`advB2 ${c ? 'PASS' : 'FAIL'} ${m}${x ? ' :: ' + x : ''}`); lastProg = Date.now() }
setInterval(() => { if (Date.now() - lastProg > 180000) { lib.log('advB2: no progress 3 min — abort'); process.exit(7) } }, 20000)
async function mk(b, o = {}) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: UA, ...o })
  await ctx.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2') } catch {} })
  const p = await ctx.newPage(); p.setDefaultTimeout(8000); const cdp = await ctx.newCDPSession(p)
  const tp = (x, y, id = 1) => ({ x, y, id, radiusX: 6, radiusY: 6, force: 1 })
  const d = { ctx, p, cdp, tp, touch: (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts }) }
  d.tap = async (x, y) => { await d.touch('touchStart', [tp(x, y)]); await p.waitForTimeout(40); await d.touch('touchEnd', []); await p.waitForTimeout(250) }
  d.cell = (roll, col = 0) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2] }, col)
  d.on = (roll, col = 0) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => r.querySelectorAll('.sw-check')[col].classList.contains('on'), col)
  d.rolls = () => p.$$eval('.sw-row[data-roll]', (rs) => rs.filter((r) => { const b = r.getBoundingClientRect(); return b.top > 180 && b.bottom < 760 }).map((r) => +r.dataset.roll))
  d.demo = async (page = '#checklist/KGB_Eng_CW') => { await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2') }); await p.goto(url + page, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.sw-row[data-roll]'); await p.waitForTimeout(500) }
  return d
}
async function testDevice(b, o) { const d = await mk(b, o); await L.betaInit(d.ctx); await L.setTestCopy(d.p, url); await sync(d); return d }
async function sync(d, wait = 120000) { const p = d.p; await p.goto(url + '#settings/sync'); await p.waitForFunction(() => document.querySelector('.sync-cta') && !document.querySelector('.sync-cta').disabled, null, { timeout: 30000 }); await L.dismissNudge(p); await p.click('.sync-cta'); await p.waitForTimeout(800); await p.waitForFunction(() => !document.querySelector('.sync-cta')?.disabled, null, { timeout: wait }).catch(() => {}); await p.waitForTimeout(500); return (await p.textContent('body')).replace(/\s+/g, ' ') }
async function T(name, fn) { if (process.env.ADV_GROUPS && !process.env.ADV_GROUPS.split(',').includes(name)) return; lib.log('advB2 group ' + name); try { await fn() } catch (e) { ok(false, name + ' threw', e.message.split('\n')[0]) } try { await lib.restore('after ' + name) } catch (e) { lib.log('RESTORE FAILED ' + e.message); process.exit(42) } }
;(async () => {
  lib = await import('./bridgeLib.mjs'); await lib.guard(); if (!(await lib.verifyBaseline()).ok) { lib.log('advB2 baseline not ok'); process.exit(42) }
  const b = await L.chromium.launch({ ...L.launchOpts, args: ['--no-sandbox'] })
  await T('grip', async () => {
    const d = await mk(b); await d.demo(); const g = await d.p.$('[data-az-grip]'); ok(!!g, 'grip shown above the A–Z strip'); if (!g) return
    const bb = await g.boundingBox(); ok(bb.width >= 44 && bb.height >= 44, 'grip hit area ≥ 44 px', `${bb.width}×${bb.height}`)
    const side = () => d.p.$eval('.sw-az', (e) => e.classList.contains('left'))
    const drag = async (toX, steps = 6) => { const g2 = await (await d.p.$('[data-az-grip]')).boundingBox(); const x0 = g2.x + g2.width / 2, y = g2.y + g2.height / 2; await d.touch('touchStart', [d.tp(x0, y)]); for (let i = 1; i <= steps; i++) { await d.touch('touchMove', [d.tp(x0 + (toX - x0) * i / steps, y)]); await d.p.waitForTimeout(20) } await d.touch('touchEnd', []); await d.p.waitForTimeout(400) }
    const s0 = await side(); await drag(250); ok((await side()) === s0, 'drag to just past the middle on the same side → stays (nearest edge)')
    await drag(40); ok((await side()) === true, 'drag to the left edge → strip snaps left')
    await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForSelector('.sw-az'); ok((await side()) === true, 'left side survives reload (az.leftSide pref)')
    await drag(390); ok((await side()) === false, 'drag back to the right edge → snaps right')
    const g3 = await (await d.p.$('[data-az-grip]')).boundingBox(); await d.tap(g3.x + 22, g3.y + 22); ok((await side()) === false, 'a plain tap on the grip does not move the strip')
    const sl = await d.p.$eval('.sw-az-slot[data-letter="A"]', (e) => e.getBoundingClientRect().top); ok(sl >= g3.y + g3.height - 2, 'grip does not cover letter A', `A top ${sl} grip bottom ${g3.y + g3.height}`)
    await d.p.focus('[data-az-grip]'); await d.p.keyboard.press('Enter'); await d.p.waitForTimeout(300); ok((await side()) === true, 'keyboard: Enter on the grip moves the strip')
    const az = await (await d.p.$('.sw-az')).boundingBox(); await d.touch('touchStart', [d.tp(az.x + az.width / 2, az.y + az.height * 0.5)]); await d.touch('touchMove', [d.tp(az.x + az.width / 2, az.y + az.height * 0.6)]); const hi = await d.p.$('.sw-az-slot.hi'); await d.touch('touchEnd', []); ok(!!hi, 'A–Z scrub still works below the grip')
    await d.ctx.close()
  })
  await T('wash-direction', async () => {
    const d = await mk(b); await d.demo(); const roll = (await d.rolls())[2]; const [x0, y] = await d.cell(roll, 0); const [x1] = await d.cell(roll, 1)
    const row = () => d.p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => ({ dir: r.dataset.wash || '', x: r.style.getPropertyValue('--wash-x'), img: getComputedStyle(r).backgroundImage }))
    const st0 = [await d.on(roll, 0), await d.on(roll, 1)]
    await d.touch('touchStart', [d.tp(x0, y)]); for (const px of [x0 + 10, x0 + 30, x1]) { await d.touch('touchMove', [d.tp(px, y + 1)]); await d.p.waitForTimeout(25) }
    const a = await row(); ok(a.dir === 'ltr', 'swipe left→right: wash trails from the left', JSON.stringify(a).slice(0, 120))
    for (const px of [x1 - 10, x1 - 30, x0]) { await d.touch('touchMove', [d.tp(px, y + 1)]); await d.p.waitForTimeout(25) }
    const c = await row(); ok(c.dir === 'rtl' && /270deg|to left/.test(c.img), 'swipe back right→left: wash flips and trails from the right', JSON.stringify(c).slice(0, 140))
    await d.touch('touchMove', [d.tp(x0 - 1, y + 1)]); const j = await row(); ok(j.dir === 'rtl', '1 px jitter does not flip the wash')
    await d.touch('touchCancel', []); await d.p.waitForTimeout(300); const e = await row(); ok(!e.dir && !e.x, 'wash cleared after the gesture ends')
    ok((await d.on(roll, 0)) === st0[0] && (await d.on(roll, 1)) === st0[1], 'cancelled swipe commits nothing')
    await d.touch('touchStart', [d.tp(x1, y)]); for (const px of [x1 - 10, x1 - 30, x0]) { await d.touch('touchMove', [d.tp(px, y + 1)]); await d.p.waitForTimeout(25) }
    const r2 = await row(); await d.touch('touchCancel', []); ok(r2.dir === 'rtl', 'swipe starting right→left: wash trails from the right', JSON.stringify(r2).slice(0, 100))
    await d.ctx.close()
  })
  await T('app-killed-mid-swipe', async () => {
    const d = await mk(b); await d.demo(); const rs = (await d.rolls()).slice(1, 5); const st0 = []; for (const r of rs) st0.push(await d.on(r))
    const pts = []; for (const r of rs) pts.push(await d.cell(r)); await d.touch('touchStart', [d.tp(...pts[0])]); for (const q of pts.slice(1)) { await d.touch('touchMove', [d.tp(...q)]); await d.p.waitForTimeout(40) }
    const p2 = await d.ctx.newPage(); await d.p.close({ runBeforeUnload: false }); await p2.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p2.waitForSelector('.sw-row[data-roll]'); await p2.waitForTimeout(500)
    const st1 = []; for (const r of rs) st1.push(await p2.$eval(`.sw-row[data-roll="${r}"]`, (e) => e.querySelectorAll('.sw-check')[0].classList.contains('on')))
    ok(JSON.stringify(st1) === JSON.stringify(st0), 'page killed mid-swipe: nothing half-committed after reopening', `${st0} → ${st1}`); await d.ctx.close()
  })
  await T('submitted-rapid', async () => {
    const d = await mk(b); await d.demo(); const roll = (await d.rolls())[1]; let [x, y] = await d.cell(roll); if (!(await d.on(roll))) await d.tap(x, y)
    await d.p.focus(`.sw-row[data-roll="${roll}"] .sw-check-hit`); await d.p.keyboard.press('m'); await d.p.waitForTimeout(300)
    const lk = () => d.p.$eval(`.sw-row[data-roll="${roll}"]`, (e) => { const c = e.querySelectorAll('.sw-check')[0]; return (c.classList.contains('on') ? 'on' : 'off') + (c.classList.contains('derived') ? '-auto' : '') })
    const seq = []; for (let i = 0; i < 15; i++) { await d.touch('touchStart', [d.tp(x, y)]); await d.p.waitForTimeout(15); await d.touch('touchEnd', []); await d.p.waitForTimeout(60); seq.push(await lk()) }
    const okCycle = seq.every((s, i) => i === 0 || s !== seq[i - 1]); ok(okCycle, '15 rapid Submitted taps: every tap changes state (no lost taps)', seq.join(','))
    const toasts = await d.p.$$eval('.toast, [role=status]', (e) => e.length); ok(toasts <= 3, 'rapid taps do not pile up toasts', `${toasts}`)
    const last = await lk(); await d.p.waitForTimeout(800); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForSelector('.sw-row[data-roll]'); await d.p.focus(`.sw-row[data-roll="${roll}"] .sw-check-hit`); await d.p.keyboard.press('m'); await d.p.waitForTimeout(300)
    ok((await lk()) === last, 'state after rapid taps survives reload', `${last} → ${await lk()}`); await d.ctx.close()
  })
  await T('two-tabs', async () => {
    const d = await mk(b); await d.demo(); const p2 = await d.ctx.newPage(); await p2.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p2.waitForSelector('.sw-row[data-roll]')
    const rs = await d.rolls(); const a = rs[1], c = rs[2]; const a0 = await d.on(a), c0 = await d.on(c)
    await d.tap(...await d.cell(a)); const a1 = await d.on(a); await d.p.waitForTimeout(800); await p2.bringToFront(); await p2.locator(`.sw-row[data-roll="${c}"] .sw-check-hit`).first().click(); await p2.waitForTimeout(500)
    await d.p.bringToFront(); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForSelector('.sw-row[data-roll]'); await d.p.waitForTimeout(500)
    ok((await d.on(a)) !== a0 && (await d.on(c)) !== c0, 'two tabs ticking different cells: both edits kept (no tab overwrites the other)', `a ${a0}→(tab1 after tap ${a1})→${await d.on(a)} c ${c0}→${await d.on(c)}; tab2 sees a=${await p2.$eval(`.sw-row[data-roll="${a}"]`, (e) => e.querySelectorAll('.sw-check')[0].classList.contains('on'))}`); await d.ctx.close()
  })
  await T('storage-quota', async () => {
    const d = await mk(b); await d.demo(); const origin = new URL(url).origin; const roll = (await d.rolls())[3]; const v0 = await d.on(roll)
    const errs = []; d.p.on('pageerror', (e) => errs.push(e.message))
    await d.cdp.send('Storage.overrideQuotaForOrigin', { origin, quotaSize: 1 }).catch((e) => errs.push('cdp ' + e.message))
    for (let i = 0; i < 5; i++) await d.tap(...await d.cell(roll))
    ok((await d.p.$('.sw-row')) !== null, 'storage quota exhausted: app keeps running', `page errors ${errs.length}${errs[0] ? ': ' + errs[0].slice(0, 80) : ''}`)
    await d.cdp.send('Storage.overrideQuotaForOrigin', { origin }).catch(() => {}); await d.tap(...await d.cell(roll)); await d.p.waitForTimeout(600)
    const want = await d.on(roll); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForSelector('.sw-row[data-roll]'); await d.p.waitForTimeout(500)
    ok((await d.on(roll)) === want, 'after quota returns, the next tick is saved and survives reload', `v0 ${v0} want ${want}`); await d.ctx.close()
  })
  await T('timezones', async () => {
    const dates = {}; for (const tz of ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      const d = await testDevice(b, { timezoneId: tz }); await d.p.goto(url + '#history'); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForTimeout(600)
      dates[tz] = await d.p.$$eval('.history-item', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 40)).join('|')); await d.ctx.close() }
    const v = Object.values(dates); ok(v[0] && v.every((x) => x === v[0]), 'same sessions/dates shown in IST, LA (−8) and Kiritimati (+14)', JSON.stringify(dates).slice(0, 300))
    const d = await testDevice(b); /* box clock zone is IST; no context timezoneId so CDP may override */ await d.p.goto(url + '#checklist/KGA_Eng_CW'); await d.p.waitForSelector('.sw-row[data-roll]'); await d.p.waitForTimeout(400)
    await d.cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' }); const roll = (await d.rolls())[2]; await d.tap(...await d.cell(roll)); const want = await d.on(roll)
    await sync(d); const s = await lib.pull(); const changed = s.ticks.filter((t) => { const b0 = lib.base.ticks.find((x) => x.tickId === t.tickId); return !b0 || b0.set !== t.set })
    ok(changed.length === 1 && changed[0].roll === roll && changed[0].set === want && s.sessions.length === 7, 'timezone changed after sync (IST→New York): tick lands on the same session, no new session', JSON.stringify(changed.map((t) => t.tickId))); await d.ctx.close()
  })
  await T('slow-3g', async () => {
    const d = await testDevice(b); await d.p.goto(url + '#checklist/KGA_Eng_CW'); await d.p.waitForSelector('.sw-row[data-roll]'); const roll = (await d.rolls())[4]; await d.tap(...await d.cell(roll)); const want = await d.on(roll)
    await d.cdp.send('Network.enable'); await d.cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2000, downloadThroughput: 50 * 1024 / 8, uploadThroughput: 20 * 1024 / 8 })
    const t0 = Date.now(); const txt = await sync(d, 170000); const ms = Date.now() - t0
    await d.cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    const t = (await lib.pull()).ticks.find((x) => x.subjectKey === 'KGA_Eng_CW' && x.roll === roll && lib.base.ticks.find((b0) => b0.tickId === x.tickId)?.set !== x.set)
    ok(!!t && t.set === want, 'very slow 3G (2 s latency, 50 kbit/s): sync completes and the tick reaches the sheet', `${ms} ms · ${(txt.match(/Pushed[^·]*/) || [''])[0]}`); await d.ctx.close()
  })
  await T('clock-rollback', async () => {
    const d = await testDevice(b); await d.p.goto(url + '#checklist/KGA_Eng_CW'); await d.p.waitForSelector('.sw-row[data-roll]'); const roll = (await d.rolls())[5]
    await d.p.clock.install({ time: new Date(Date.now() - 3 * 3600e3) }); await d.p.reload({ waitUntil: 'networkidle' }); await d.p.waitForSelector('.sw-row[data-roll]'); await d.p.waitForTimeout(500)
    await d.tap(...await d.cell(roll)); const want = await d.on(roll); await sync(d)
    const t = (await lib.pull()).ticks.find((x) => x.subjectKey === 'KGA_Eng_CW' && x.roll === roll && lib.base.ticks.find((b0) => b0.tickId === x.tickId)?.set !== x.set)
    ok(!!t && t.set === want, 'phone clock rolled back 3 h after a sync: the new tick still wins on the sheet', t ? `stamp ${t.updatedAt}` : 'not applied'); await d.ctx.close()
  })
  await b.close(); const v = await lib.verifyBaseline(); const f = res.filter((r) => r[0] === 'FAIL').length
  lib.log(`advB2 done ${res.length - f} pass ${f} fail; baseline ${v.ok}`); console.log(JSON.stringify(res)); process.exit(0)
})().catch((e) => { lib?.log('advB2 error ' + e.message); process.exit(2) })
