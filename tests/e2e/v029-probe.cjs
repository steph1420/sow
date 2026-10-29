// v0.29.0 (t170u/t171u) — REAL touch (CDP): hesitancy, native scroll, Share sheet close/drag/date, haptics palette, chip hit 44.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  await p.addInitScript(() => { window.__vib = []; navigator.vibrate = (ms) => { window.__vib.push(ms); return true; }; });
  const fresh = async (prefs = {}, hash = '#checklist/KGB_Eng_CW') => {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((pr) => { indexedDB.deleteDatabase('sow'); localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify(pr)); }, prefs);
    await p.goto(url + hash, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  };
  const cell = (roll, col) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); const rr = r.getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2, rr.height]; }, col);
  const glow = () => p.$$eval('.sw-row.paint-glow', (e) => e.map((x) => x.dataset.roll));

  // 1. Hesitancy: sideways swipe drifting ~0.5 row down stays on 1 row; going ~1.7 rows down extends
  await fresh({ 'gestures.swipeSingleRow': false });
  let [x, y, rh] = await cell(4, 0); const [x2] = await cell(4, 1);
  await touch('touchStart', x, y);
  for (const [px, py] of [[x + 14, y + 2], [x + 30, y + 8], [x2, y + rh * 0.55], [x2 + 8, y + rh * 0.7]]) { await touch('touchMove', px, py); await p.waitForTimeout(16); }
  let g = await glow(); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(g.length === 1 && g[0] === '4', `hesitant: ~0.7-row drift keeps 1 row (glow ${g})`);
  [x, y, rh] = await cell(8, 0);
  await touch('touchStart', x, y);
  for (const [px, py] of [[x + 14, y + 2], [x + 30, y + 8], [x2, y + rh * 0.9], [x2 + 8, y + rh * 1.3]]) { await touch('touchMove', px, py); await p.waitForTimeout(16); }
  g = await glow(); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(g.length >= 2 && g.includes('8') && g.includes('9'), `deliberate pull extends (glow ${g})`);
  const v1 = await p.evaluate(() => window.__vib);
  ok(v1.includes(7) && v1.includes(18), `swipe haptics selection 7 + commit 18 (${JSON.stringify(v1)})`);

  // 2. Native scroll starting on ✓ column and on names (no JS interference, no ticks)
  for (const sel of ['.sw-check-hit', '.sw-name']) {
    await fresh();
    const before = await p.$$eval('.sw-check.on', (e) => e.length);
    const pt = await p.$$eval(sel, (els) => { const e = els.find((x) => x.getBoundingClientRect().top > 500); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const t0 = await p.$eval('.sw-list-wrap', (e) => e.scrollTop);
    await touch('touchStart', pt[0], pt[1]);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', pt[0] + (i % 2), pt[1] - i * 40); await p.waitForTimeout(8); }
    await touch('touchEnd');
    const tEnd = await p.$eval('.sw-list-wrap', (e) => e.scrollTop);
    await p.waitForTimeout(500);
    const tLater = await p.$eval('.sw-list-wrap', (e) => e.scrollTop);
    const after = await p.$$eval('.sw-check.on', (e) => e.length);
    ok(tEnd - t0 > 200 && after === before && (await glow()).length === 0, `${sel}: vertical drag scrolls natively ${t0}→${tEnd}→${tLater} (momentum ${tLater > tEnd ? 'yes' : 'n/a'}), no ticks`);
  }

  // 3. Share sheet
  const openTools = async () => { await p.click('.sw-tools-chip'); await p.click('.sw-tools-row.share'); await p.waitForSelector('.share-sheet'); await p.waitForTimeout(250); };
  await fresh();
  await openTools();
  const txt = await p.$eval('.share-sheet', (e) => e.innerText);
  ok(!/Long-press a template|Manage in Settings/.test(txt), 'no bottom instructions');
  ok(!/New/.test(txt) && !(await p.$('.share-pill.add')), "no '+ New' pill");
  ok(!/KGA\/KGB prefix/.test(txt) && !(await p.$('.share-prefix-row')), 'no prefix toggle in sheet');
  const dates = await p.$$eval('.share-date', (e) => e.map((x) => [x.textContent, x.getAttribute('aria-checked')]));
  ok(dates.length === 2 && dates[0][1] === 'true', `two-date toggle, first default ${JSON.stringify(dates)}`);
  const d0 = await p.$eval('.share-sheet', (e) => e.dataset.date);
  await p.click('.share-date:nth-child(2)'); await p.waitForTimeout(100);
  const d1 = await p.$eval('.share-sheet', (e) => [e.dataset.date, e.dataset.message.split('\n')[0]]);
  ok(d1[0] !== d0 && d1[1].includes(dates[1][0]), `date toggle switches message date → ${d1[1]}`);
  const xb = await p.$eval('.share-x', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, getComputedStyle(e).color]; });
  ok(xb[0] >= 44 && xb[1] >= 44, `× is 44×44 (${xb})`);
  await p.click('.share-x'); await p.waitForTimeout(250);
  ok(!(await p.$('.share-sheet')), '× closes');
  await openTools();
  const gh = await p.$eval('.share-grab-hit', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height]; });
  await touch('touchStart', gh[0], gh[1]); await p.waitForTimeout(40); await touch('touchEnd'); await p.waitForTimeout(250);
  ok(!(await p.$('.share-sheet')), `handle tap closes (hit h=${gh[2]})`);
  await openTools();
  const sh = await p.$eval('.share-sheet', (e) => e.offsetHeight);
  await touch('touchStart', gh[0], gh[1]);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', gh[0], gh[1] + i * 10); await p.waitForTimeout(30); }
  const follow = await p.$eval('.share-sheet', (e) => e.style.transform);
  await touch('touchEnd'); await p.waitForTimeout(350);
  ok(/translateY\(60px\)/.test(follow) && !!(await p.$('.share-sheet')) && (await p.$eval('.share-sheet', (e) => e.style.transform)) === '', `short slow drag follows finger (${follow}) then springs back`);
  await touch('touchStart', gh[0], gh[1]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', gh[0], gh[1] + i * sh * 0.04); await p.waitForTimeout(40); }
  await touch('touchEnd'); await p.waitForTimeout(400);
  ok(!(await p.$('.share-sheet')), 'drag past ~30% dismisses');
  await openTools();
  await touch('touchStart', gh[0], gh[1]);
  for (let i = 1; i <= 3; i++) { await touch('touchMove', gh[0], gh[1] + i * 25); await p.waitForTimeout(8); }
  await touch('touchEnd'); await p.waitForTimeout(400);
  ok(!(await p.$('.share-sheet')), 'quick fling (75px) dismisses');
  await openTools(); await p.click('.share-scrim', { position: { x: 200, y: 20 } }); await p.waitForTimeout(250);
  ok(!(await p.$('.share-sheet')), 'tap outside still closes');
  await openTools(); await p.goBack(); await p.waitForTimeout(300);
  ok(!(await p.$('.share-sheet')) && /checklist/.test(p.url()), 'Back still closes sheet first');

  // 4. Haptics intensity
  await fresh({ 'haptics.level': 'strong' }, '#settings/appearance');
  const opts = await p.$$eval('.haptics-opt', (e) => e.map((x) => x.textContent));
  ok(JSON.stringify(opts) === '["Off","Light","Normal","Strong"]', 'Appearance: Off/Light/Normal/Strong ' + opts);
  await fresh({ 'haptics.level': 'strong' });
  await p.evaluate(() => { window.__vib = []; });
  await p.click('.sw-allbox'); await p.waitForTimeout(100);
  ok(JSON.stringify(await p.evaluate(() => window.__vib)) === '[[18,40,18]]', 'Strong scales tick-all success → [18,40,18]');
  await fresh({ 'haptics.level': 'off' });
  [x, y] = await cell(3, 0); await touch('touchStart', x, y); await p.waitForTimeout(30); await touch('touchEnd'); await p.waitForTimeout(150);
  ok((await p.evaluate(() => window.__vib)).length === 0, 'Off → silent');
  await fresh({ 'haptics.enabled': false }, '#settings/appearance');
  ok(await p.$eval('.haptics-opt.on', (e) => e.dataset.level) === 'off', 'legacy haptics.enabled=false migrates to Off');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
