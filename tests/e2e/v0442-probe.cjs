// v0.44.2 (t52u) — delete / move of a date is ONE toolbar undo step: undo brings back date + topic + ticks,
// redo deletes again, tick steps of a deleted date are purged, toasts name what happened. Demo data, REAL touch.
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
  await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const hdr = () => p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent).join(' '));
  const nTicks = () => p.$$eval('[aria-checked=true]', (e) => e.length);
  const toastTxt = async () => { await p.waitForTimeout(350); return p.$$eval('.toast-msg', (e) => e.map((x) => x.textContent).pop() || ''); };
  const undoBtn = (n) => p.locator(`button[aria-label=${n}]`).first();
  const D = await hdr(); const t0 = await nTicks();
  for (const i of [0, 1, 2]) { const before = await nTicks(); await tapSel(`.sw-check-hit >> nth=${i}`); await p.waitForTimeout(250); if ((await nTicks()) < before) { await tapSel(`.sw-check-hit >> nth=${i}`); await p.waitForTimeout(250); } }
  const t1 = await nTicks(); ok(t1 > t0, `ticked on ${D} (${t0} → ${t1})`);
  const openAll = async () => { await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.waitForTimeout(500); await p.locator('.ov-card').filter({ hasText: 'KGB' }).first().locator('.top').tap(); await p.waitForSelector('.ad-row'); };
  const isoOf = async (label) => { const [d, m] = label.trim().split('/'); return p.$$eval('.ad-row', (r, dm) => (r.map((x) => x.dataset.iso).find((i) => +i.slice(8) === +dm[0] && +i.slice(5, 7) === +dm[1]) || null), [d, m]); };
  const editRow = async (iso) => { const bb = await p.locator(`.ad-row[data-iso="${iso}"]`).boundingBox(); await drag(bb.x + bb.width - 30, bb.y + bb.height / 2, -140, 0); await tapSel('.ad-row.armed .ad-edit'); await p.waitForSelector('.dem'); await p.waitForTimeout(300); };
  await openAll(); const iso = await isoOf(D); ok(!!iso, `found ${D} in All dates (${iso})`);
  await editRow(iso); await tapSel('.dem-del'); await p.waitForTimeout(250); if (await p.$('.dem-confirm .danger')) await tapSel('.dem-confirm .danger'); await p.waitForTimeout(600);
  ok(!(await isoOf(D)), 'date deleted');
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  ok(!(await hdr()).includes(D), `checklist no longer shows ${D} (${await hdr()})`);
  await undoBtn('Undo').tap(); let tt = await toastTxt();
  ok(/^Restored \w{3} \d+\/\d+ · \d+ ticks?$/.test(tt), `ONE Undo restores the date — toast "${tt}"`);
  ok((await hdr()).includes(D) && (await nTicks()) === t1, `date + all its ticks back (${await hdr()} · ${await nTicks()} ticks)`);
  let st = await settings('sow-app'); ok(!((st && st.structOps) || []).some((o) => o.kind === 'delete'), 'queued delete removed by the undo');
  await undoBtn('Redo').tap(); tt = await toastTxt();
  ok(/^Deleted \w{3} \d+\/\d+ again$/.test(tt) && !(await hdr()).includes(D), `Redo deletes again — "${tt}"`);
  st = await settings('sow-app'); ok(((st && st.structOps) || []).some((o) => o.kind === 'delete'), 'redo queues the delete again');
  await undoBtn('Undo').tap(); tt = await toastTxt(); ok(/^Restored/.test(tt) && (await nTicks()) === t1, 'Undo again restores');
  ok(await undoBtn('Undo').isDisabled(), 'tick steps of the deleted date were folded into the delete (nothing left to undo)');
  // move: one step back
  await openAll(); await editRow(iso);
  await p.$eval('.dp-dials [data-dial=date]', (e) => e.focus()); for (let i = 0; i < 12 && (i === 0 || (await p.$eval('.dem-ok', (e) => e.disabled))); i++) await p.keyboard.press('ArrowUp');
  const to = await p.$eval('.dem .dp-picker', (e) => e.dataset.iso); await tapSel('.dem-ok'); await p.waitForTimeout(600);
  ok(!(await p.$(`.ad-row[data-iso="${iso}"]`)) && !!(await p.$(`.ad-row[data-iso="${to}"]`)), `moved ${iso} → ${to}`);
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  await undoBtn('Undo').tap(); tt = await toastTxt(); ok(/^Moved back to \w{3} \d+\/\d+$/.test(tt), `ONE Undo moves it back — "${tt}"`);
  ok((await hdr()).includes(D) && (await nTicks()) === t1, `ticks moved back with it (${await nTicks()})`);
  st = await settings('sow-app'); ok(!((st && st.structOps) || []).some((o) => o.kind === 'rename'), 'rename + its reverse cancel out in the Sync queue');
  await undoBtn('Redo').tap(); tt = await toastTxt(); ok(/^Moved to \w{3} \d+\/\d+ again$/.test(tt), `Redo moves again — "${tt}"`);
  ok(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
