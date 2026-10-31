// v0.44.0 Beta — REAL touch via CDP: Overview card → All dates (newest first, months, no truncation), row tap loads
// the date, past = amber LOCKED look, Back restores exactly, 1-date default on a fresh device, Stable/Beta separate
// caches, rename/delete queued for Sync.
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

  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); indexedDB.deleteDatabase('sow-app-beta'); localStorage.clear(); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);

  // 1 fresh device → 1-date view
  ok((await p.$$('.sw-dh-date')).length === 1 && (await p.evaluate(() => localStorage.getItem('sow.dateCols'))) === '1', 'fresh device starts on the 1-date view (saved "1")');
  // existing device keeps '2'
  await p.evaluate(() => localStorage.setItem('sow.dateCols', '2')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok((await p.$$('.sw-dh-date')).length === 2, 'device with saved "2" keeps the 2-date view');
  const before = await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent).join(' '));
  // the dates chip opens the new popover (old Dates sheet retired)
  await tapSel('.sw-lean-dates'); ok(!!(await p.$('.dpo')) && !(await p.$('.dp-sheet')), 'dates chip opens the date popover (no old sheet)');
  await tap(10, 905);
  // tick one box so "state preserved" is checkable
  await tapSel('.sw-check-hit >> nth=4'); await p.waitForTimeout(400);
  const ticksBefore = await p.$$eval('[aria-checked=true]', (e) => e.length);

  // 2 Overview card → All dates
  await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(!(await p.$('.ov-card.exp')) && !(await p.$('.ov-status')), 'no expanded view on Overview');
  await tapSel('.ov-card .top'); await p.waitForSelector('[data-testid=all-dates]');
  // seed three older dates through the Add Date pill (demo data only has the current pair)
  for (const n of [20, 23, 26]) {
    await tapSel('.ad-add'); await p.waitForSelector('.dem');
    await p.$eval('.dp-dials [data-dial=date]', (e) => e.focus()); for (let i = 0; i < n; i++) await p.keyboard.press('ArrowDown');
    await p.fill('.dem-topic', `Older probe topic ${n} with a long name that must wrap, not truncate`);
    await tapSel('.dem-ok'); await p.waitForTimeout(400);
  }
  const rows = await p.$$eval('.ad-row', (r) => r.map((x) => x.dataset.iso));
  ok(rows.length >= 2 && [...rows].sort().reverse().join() === rows.join(), `All dates newest first (${rows.length} rows)`);
  ok((await p.$$('.ad-mh')).length >= 1, 'month headers present');
  const trunc = await p.$$eval('.ad-tp, .ad-d', (e) => e.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
  ok(trunc === 0, 'no truncated date/topic text at 412px');
  ok(await p.$$eval('.ad-row', (r) => r.every((x) => x.querySelector('.ad-bar') && x.querySelector('.ad-n'))), 'each row has a bar and a count');
  ok(!!(await p.$('.ad-add')), 'Add Date pill present');
  // swipe → EDIT covers topic only
  const r1 = await p.locator('.ad-row >> nth=1').boundingBox();
  await drag(r1.x + r1.width - 30, r1.y + r1.height / 2, -140, 0);
  const sw = await p.evaluate(() => { const r = document.querySelector('.ad-row.armed'); if (!r) return null; const e = r.querySelector('.ad-edit').getBoundingClientRect(); const d = r.querySelector('.ad-d').getBoundingClientRect(); return { el: e.left, dr: d.right }; });
  ok(sw && sw.el >= sw.dr - 1, 'swipe ← shows EDIT over the topic only (date visible)');
  await tapSel('.ad-row.armed .ad-edit'); ok(!!(await p.$('.dem .dem-big')), 'EDIT opens the v0.43 edit popup');
  await tap(10, 905);
  // hold → edit
  const r2 = await p.locator('.ad-row >> nth=2').boundingBox();
  await touch('touchStart', r2.x + 200, r2.y + r2.height / 2); await p.waitForTimeout(700); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(!!(await p.$('.ad-row.armed')), 'hold arms EDIT');
  await tapSel('.ad-row.armed .ad-edit'); await p.waitForTimeout(200); await tap(10, 905);

  // 3 tap oldest (past) row → amber locked look
  const oldest = rows[rows.length - 1];
  await tapSel(`.ad-row[data-iso="${oldest}"]`); await p.waitForTimeout(600);
  const amber = await p.evaluate(() => { const b = document.querySelector('[data-testid=past-bar]'); return b ? { t: b.textContent, bg: getComputedStyle(b).backgroundColor, wm: !!document.querySelector('.past-wm'), pg: document.querySelector('.sw-page').classList.contains('past') } : null; });
  ok(amber && /PAST ·/.test(amber.t) && /Back to/.test(amber.t) && amber.wm && amber.pg && amber.bg !== 'rgba(0, 0, 0, 0)', `past date → amber bar "${amber && amber.t}" + watermark + tint`);
  const hp = await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent));
  const [, mo, da] = oldest.split('-'); ok(hp.length === 1 && hp[0].includes(`${da}/${mo}`), `checklist shows only the past date (${hp.join()})`);
  // past stays editable
  const pc0 = await p.$$eval('[aria-checked=true]', (e) => e.length);
  await tapSel('.sw-check-hit >> nth=0'); await p.waitForTimeout(500);
  ok((await p.$$eval('[aria-checked=true]', (e) => e.length)) === pc0 + 1, 'past date stays editable (tick added)');
  // Back restores exactly
  await tapSel('.past-back'); await p.waitForTimeout(500);
  const after = await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent).join(' '));
  const ticksAfter = await p.$$eval('[aria-checked=true]', (e) => e.length);
  ok(!(await p.$('[data-testid=past-bar]')) && after === before && ticksAfter === ticksBefore, `Back restores the current view exactly (${after} · ${ticksAfter} ticks)`);
  ok(/KGB/.test(await p.textContent('.sw-lean-class')), `Back returns to the class you were on (${await p.textContent('.sw-lean-class')})`);
  ok((await p.evaluate(() => localStorage.getItem('sow.dateCols'))) === '2', 'saved 1|2 choice untouched by the past view');

  // 4 rename/delete queued for Sync
  await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await tapSel('.ov-card .top'); await p.waitForSelector('.ad-row');
  const tgt = (await p.$$eval('.ad-row', (r) => r.map((x) => x.dataset.iso)))[1];
  const tb = await p.locator(`.ad-row[data-iso="${tgt}"]`).boundingBox(); await drag(tb.x + tb.width - 30, tb.y + tb.height / 2, -140, 0);
  await tapSel('.ad-row.armed .ad-edit'); await p.waitForSelector('.dem-del');
  await tapSel('.dem-del'); await p.waitForTimeout(250); if (await p.$('.dem-confirm .danger')) await tapSel('.dem-confirm .danger'); await p.waitForTimeout(600);
  let st = await settings('sow-app');
  ok(st && (st.structOps || []).some((o) => o.kind === 'delete' && o.date === tgt), `delete queued for Sync (${JSON.stringify((st && st.structOps) || [])})`);
  // move another date via the popup dial
  const mv = (await p.$$eval('.ad-row', (r) => r.map((x) => x.dataset.iso)))[1];
  const mb = await p.locator(`.ad-row[data-iso="${mv}"]`).boundingBox(); await drag(mb.x + mb.width - 30, mb.y + mb.height / 2, -140, 0);
  await tapSel('.ad-row.armed .ad-edit'); await p.waitForSelector('.dem');
  await p.$eval('.dp-dials [data-dial=date]', (e) => e.focus()); for (let i = 0; i < 6 && (await p.$eval('.dem-ok', (e) => e.disabled) || i === 0); i++) await p.keyboard.press('ArrowDown');
  await tapSel('.dem-ok'); await p.waitForTimeout(600);
  st = await settings('sow-app');
  ok((st.structOps || []).some((o) => o.kind === 'rename' && o.from === mv), `rename queued for Sync (from ${mv})`);
  ok(st.syncDirty === true, 'Sync marked dirty');

  // 5 Stable/Beta: separate caches
  await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForSelector('.ds-card');
  ok(!(await p.$('.ch-badge')), 'no BETA badge on Stable');
  ok(await p.$eval('.ds-seg button >> nth=1', (e) => e.disabled), 'Beta disabled until a TEST copy URL is entered');
  await p.fill('input[name="sow.betaUrl"]', 'https://script.google.com/macros/s/PROBE-FAKE-not-real/exec'); await p.locator('input[name="sow.betaUrl"]').blur();
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), tapSel('.ds-seg button >> nth=1')]); await p.waitForTimeout(800);
  ok((await p.evaluate(() => localStorage.getItem('sow.channel'))) === 'beta', 'channel saved per device = beta');
  ok(!!(await p.$('.ch-badge')), `channel indicator shown (${await p.textContent('.ch-badge').catch(() => '')})`);
  const list = await dbs(); ok(list.includes('sow-app') && list.includes('sow-app-beta'), `separate IDBs: ${list.join(', ')}`);
  const sb = await settings('sow-app-beta'); ok(!sb || !(sb.structOps || []).length, 'Beta cache does not see Stable queued ops');
  const sbUrl = await p.evaluate(() => localStorage.getItem('sow.betaUrl')); ok(/PROBE-FAKE/.test(sbUrl), 'Beta URL stored per device');
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), tapSel('.ds-seg button >> nth=0')]); await p.waitForTimeout(800);
  st = await settings('sow-app'); ok((await p.evaluate(() => localStorage.getItem('sow.channel'))) === 'stable' && (st.structOps || []).length >= 2, 'back on Stable, its cache + queue intact');
  ok(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
