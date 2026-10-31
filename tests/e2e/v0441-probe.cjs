// v0.44.1 — REAL touch via CDP: tap a non-centred dial value → it snaps to centre and is selected (Month/Date/Day),
// a drag never tap-selects, ArrowUp = later, Cancel button next to ✓ (tap-outside still cancels).
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone({ fresh: true });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await touch('touchEnd'); await p.waitForTimeout(350); };
  const drag = async (x, y, dx, dy, steps = 8) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(400); };
  const tapSel = async (sel) => { const r = await p.locator(sel).first().boundingBox(); await tap(r.x + r.width / 2, r.y + r.height / 2); };
  const settings = (db) => p.evaluate((db) => new Promise((res) => { const r = indexedDB.open(db); r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('settings')) return res(null); const g = d.transaction('settings').objectStore('settings').get('app'); g.onsuccess = () => { res(g.result || null); d.close(); }; }; }), db);
  const dbs = () => p.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  await tapSel('.ov-card .top'); await p.waitForSelector('[data-testid=all-dates]');
  const nRows = async () => (await p.$$('.ad-row')).length; const rows0 = await nRows();
  await tapSel('.ad-add'); await p.waitForSelector('.dem');
  const iso = () => p.$eval('.dem .dp-picker', (e) => e.dataset.iso);
  const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const rowBox = (dial, k) => p.locator(`.dem .dp-dials [data-dial=${dial}] [data-k="${k}"]`).boundingBox();
  // Date dial: tap row +1 (below centre) → next date, glides
  let i0 = await iso(); let r = await rowBox('date', 1); await tap(r.x + r.width / 2, r.y + r.height / 2);
  const snapSeen = await p.$('.dem .dp-dials [data-dial=date] .dp-snap'); const i1 = await iso();
  ok(i1 === (i0.slice(8) === String(new Date(Date.UTC(+i0.slice(0, 4), +i0.slice(5, 7), 0)).getUTCDate()) ? i0.slice(0, 8) + '01' : add(i0, 1)), `tap Date row +1 selects it (${i0} → ${i1})`);
  ok(!!snapSeen, 'tapped value glides into the centre (dp-snap)');
  r = await rowBox('date', -2); await tap(r.x + r.width / 2, r.y + r.height / 2); ok((await iso()) !== i1, `tap Date row −2 selects it (${i1} → ${await iso()})`);
  // Month dial tap
  const m0 = (await iso()).slice(5, 7); r = await rowBox('month', 1); await tap(r.x + r.width / 2, r.y + r.height / 2);
  ok(Number((await iso()).slice(5, 7)) === (Number(m0) % 12) + 1, `tap Month row +1 → next month (${m0} → ${(await iso()).slice(5, 7)})`);
  // Day dial tap moves the date
  i0 = await iso(); r = await rowBox('day', -1); await tap(r.x + r.width / 2, r.y + r.height / 2);
  ok((await iso()) !== i0, `tap Day row −1 moves the date (${i0} → ${await iso()})`);
  // drag: steps follow the finger, never a tap-select of the start row
  i0 = await iso(); r = await rowBox('date', 1); await drag(r.x + r.width / 2, r.y + r.height / 2, 0, -88);
  const i2 = await iso(); ok(i2 !== i0 && i2 !== add(i0, 1) || /-0[12]$/.test(i2), `drag up 2 rows turns 2 steps, not a tap (${i0} → ${i2})`);
  // keyboard: ArrowUp = later
  await p.$eval('.dem .dp-dials [data-dial=month]', (e) => e.focus()); const mk = Number((await iso()).slice(5, 7)); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
  ok(Number((await iso()).slice(5, 7)) === (mk % 12) + 1, 'ArrowUp turns Month later');
  // Cancel button
  const cb = await p.$('.dem .dem-head .dem-cancel'); ok(!!cb && /Cancel/.test(await cb.textContent()), 'Add popup has a Cancel button');
  const okb = await p.$eval('.dem .dem-ok', (e) => e.getBoundingClientRect().left); const cbl = await p.$eval('.dem .dem-cancel', (e) => e.getBoundingClientRect().right);
  ok(cbl <= okb + 1, 'Cancel sits next to ✓');
  await p.waitForTimeout(450); await tapSel('.dem .dem-cancel'); await p.waitForTimeout(400); ok(!(await p.$('.dem')) && (await nRows()) === rows0, 'Cancel closes Add without adding');
  // Edit popup: Cancel + tap-outside
  const rb = await p.locator('.ad-row >> nth=1').boundingBox(); await drag(rb.x + rb.width - 30, rb.y + rb.height / 2, -140, 0);
  await tapSel('.ad-row.armed .ad-edit'); await p.waitForTimeout(500); ok(!!(await p.$('.dem')), 'Edit stays open after the opening tap (no ghost click on Cancel)'); ok(!!(await p.$('.dem .dem-cancel')), 'Edit popup has a Cancel button');
  r = await rowBox('date', 1); await tap(r.x + r.width / 2, r.y + r.height / 2);
  await p.waitForTimeout(450); await tapSel('.dem .dem-cancel'); await p.waitForTimeout(400);
  const st = await settings('sow-app'); ok(!(await p.$('.dem')) && !((st && st.structOps) || []).length, 'Cancel on Edit discards the change (no rename queued)');
  await tapSel('.ad-add'); await p.waitForSelector('.dem'); await p.waitForTimeout(450); await tap(200, 40); await p.waitForTimeout(400); ok(!(await p.$('.dem')), 'tap-outside still cancels');
  ok(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
