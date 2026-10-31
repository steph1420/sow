// t169u — haptics with REAL touch: A–Z letter changes tick once each, tap tick pulses 10ms, swipe commit 15ms, toggle off = silent.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  await p.addInitScript(() => { window.__vib = []; navigator.vibrate = (ms) => { window.__vib.push(ms); return true; }; });
  const go = async (on) => { await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((on) => { localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ 'haptics.enabled': on })); }, on); await p.goto(url + '#checklist/KGA_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); await p.evaluate(() => { window.__vib = []; }); };
  const scrub = async () => { const az = await p.locator('.sw-az').boundingBox(); const x = az.x + az.width / 2; await touch('touchStart', x, az.y + 4); for (let i = 1; i <= 30; i++) { await touch('touchMove', x, az.y + 4 + (az.height * 0.5) * i / 30); await p.waitForTimeout(12); } await touch('touchEnd'); await p.waitForTimeout(300); };
  await go(true);
  await scrub();
  let v = await p.evaluate(() => window.__vib);
  ok(v.length >= 8 && v.length <= 14 && v.every((x) => x === 7), `A–Z scrub A→~M: ${v.length} ticks of 7ms (v0.29 selection) (one per letter change)`);
  await p.evaluate(() => { window.__vib = []; });
  const c = await p.$$eval('.sw-check-hit', (els) => { const e = els.find((x) => { const r = x.getBoundingClientRect(); return r.top > 300 && r.bottom < 700; }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await touch('touchStart', ...c); await p.waitForTimeout(40); await touch('touchEnd'); await p.waitForTimeout(200);
  v = await p.evaluate(() => window.__vib); ok(JSON.stringify(v) === '[10]', 'tap tick → 10ms ' + JSON.stringify(v));
  await go(false); await scrub();
  v = await p.evaluate(() => window.__vib); ok(v.length === 0, 'Haptics off → silent');
  await p.goto(url + '#settings/appearance', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  ok(await p.$('.haptics-row').then(Boolean), 'Appearance has Haptics toggle');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
