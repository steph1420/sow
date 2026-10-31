// v0.43.0 Beta — date popover + Add/Edit popup, REAL touch via CDP: tap-pick, swipe-edit (date stays visible), long-press,
// outside cancels, add two dates, move keeps marks, clash blocks Save, delete+undo with real mark count, finger scroll.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await touch('touchEnd'); await p.waitForTimeout(350); };
  const drag = async (x, y, dx, dy, steps = 8) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(400); };
  const center = async (sel) => { const r = await p.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  const tapSel = async (sel) => { const [x, y] = await center(sel); await tap(x, y); };
  const openPop = async () => { await tapSel('.sw-dh-btn >> nth=-1'); await p.waitForSelector('.dpo'); };
  const isos = () => p.$$eval('.dpo-row', (r) => r.map((x) => x.dataset.iso));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);

  // 1 tap header → popover; tap a row → active date
  await openPop(); const list = await isos(); ok(list.length >= 2, `popover lists ${list.length} sessions oldest first: ${[...list].sort().join() === list.join()}`);
  await tapSel(`.dpo-row[data-iso="${list[0]}"]`);
  ok(!(await p.$('.dpo')), 'tap row closes popover');
  const hd = await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent));
  const [y0, m0, d0] = list[0].split('-').map(Number); ok(hd.includes(`${String(d0).padStart(2, '0')}/${String(m0).padStart(2, '0')}`) || hd.some((t) => t.startsWith(String(d0).padStart(2,'0'))), `tapped date is now shown in header (${hd.join(' ')})`);

  // 2 swipe-left a row → EDIT tab over topic only, date visible
  await openPop(); const row = `.dpo-row[data-iso="${list[1]}"]`;
  const rb = await p.locator(row).boundingBox();
  await drag(rb.x + rb.width - 30, rb.y + rb.height / 2, -120, 0);
  const sw = await p.evaluate((sel) => { const r = document.querySelector(sel); const e = r.querySelector('.dpo-edit').getBoundingClientRect(); const d = r.querySelector('.dpo-date').getBoundingClientRect(); return { swiped: r.classList.contains('swiped'), editLeft: e.left, dateRight: d.right, dateVis: d.width > 0 }; }, row);
  ok(sw.swiped && sw.editLeft >= sw.dateRight - 1 && sw.dateVis, `swipe reveals EDIT over topic only (edit.left ${sw.editLeft|0} ≥ date.right ${sw.dateRight|0})`);
  await tapSel(`${row} .dpo-edit`); ok(!!(await p.$('.dem')) && !(await p.$('.dpo')), 'EDIT tab opens popup, popover closed');
  // outside cancels
  await tap(10, 905); ok(!(await p.$('.dem')), 'tap outside popup cancels');

  // 3 long-press → edit
  await openPop(); const lb = await p.locator(row).boundingBox();
  await touch('touchStart', lb.x + 40, lb.y + lb.height / 2); await p.waitForTimeout(700); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(!!(await p.$('.dem .dem-big')), 'long-press opens Edit popup (big date)');
  await tap(10, 905);

  // 4 add two dates
  await openPop(); await tapSel('.dpo-add'); await p.waitForSelector('.dem-slot');
  ok((await p.$$('.dem-slot')).length === 1, 'Add starts with one squircle (today)');
  await tapSel('.dem-plus'); ok((await p.$$('.dem-slot')).length === 2, '＋ adds a second squircle');
  const focused = await p.$eval('.dem-slot.on .k', (e) => e.textContent); ok(focused === 'Date 2', 'new squircle is focused');
  await p.fill('.dem-topic', 'Probe topic B'); await p.$eval('.dem-slot >> nth=0', (e) => e.click()).catch(() => {});
  await tapSel('.dem-slot >> nth=0'); await p.fill('.dem-topic', 'Probe topic A');
  const okDisabled = await p.$eval('.dem-ok', (e) => e.disabled);
  if (okDisabled) console.log('note: today clashes with an existing session —', await p.textContent('.dem-note'));
  if (okDisabled) { await p.$eval('.dp-dials [data-dial=date]', (e) => e.focus()); for (let i = 0; i < 2 && (await p.$eval('.dem-ok', (e) => e.disabled)); i++) { await p.keyboard.press('ArrowUp'); } }
  await tapSel('.dem-ok'); await p.waitForTimeout(300);
  await openPop(); const after = await isos(); ok(after.length === list.length + 2, `two dates added (${list.length} → ${after.length})`);
  const topics = await p.$$eval('.dpo-tt', (e) => e.map((x) => x.textContent)); ok(topics.includes('Probe topic A') && topics.includes('Probe topic B'), 'both topics saved');
  await tap(10, 905);

  // 5 clash blocks save; move keeps marks
  // tick 3 boxes on the newest shown date first
  const cols = await p.$$eval('.sw-colhead .sw-dh', (e) => e.length);
  const shownIso = await p.evaluate(() => [...document.querySelectorAll('.sw-dh-btn')].map((b) => b.getAttribute('aria-label')));
  for (let i = 0; i < 3; i++) { const [x, y] = await center(`.sw-row >> nth=${i} >> .sw-check-hit >> nth=${cols - 1}`); await tap(x, y); }
  await openPop(); const curIso = await p.$eval('.dpo-row.cur', (e) => e.dataset.iso); const list2 = await isos();
  const marked = await p.evaluate(() => [...document.querySelectorAll('.sw-row')].slice(0, 3).map((r) => [...r.querySelectorAll('.sw-check')].pop().classList.contains('on')));
  ok(marked.every(Boolean), `3 marks ticked on ${curIso} (${shownIso.length} cols)`);
  const cb = await p.locator(`.dpo-row[data-iso="${curIso}"]`).boundingBox();
  await touch('touchStart', cb.x + 40, cb.y + cb.height / 2); await p.waitForTimeout(700); await touch('touchEnd'); await p.waitForTimeout(300);
  // clash: turn date dial to another existing session in same month if any
  const other = list2.find((d) => d !== curIso && d.slice(0, 7) === curIso.slice(0, 7));
  if (other) {
    const diff = Number(other.slice(8)) - Number(curIso.slice(8));
    await p.$eval('.dp-dials [data-dial=date]', (e) => e.focus());
    for (let i = 0; i < Math.abs(diff); i++) await p.keyboard.press(diff > 0 ? 'ArrowDown' : 'ArrowUp');
    ok(await p.$eval('.dem-ok', (e) => e.disabled), `clash with ${other} blocks Save: "${await p.textContent('.dem-note')}"`);
    for (let i = 0; i < Math.abs(diff); i++) await p.keyboard.press(diff > 0 ? 'ArrowUp' : 'ArrowDown');
  } else console.log('SKIP clash (no other session in same month)');
  // move to a free date via the Month dial (touch drag up one step = next month)
  const [mx, my] = await center('.dp-dials [data-dial=month]');
  await drag(mx, my, 0, -48);
  const newIso = await p.$eval('.dp-picker', (e) => e.dataset.iso);
  const blocked = await p.$eval('.dem-ok', (e) => e.disabled);
  ok(newIso !== curIso && !blocked, `month dial (touch) moves ${curIso} → ${newIso}`);
  await tapSel('.dem-ok'); await p.waitForTimeout(500);
  await openPop(); const list3 = await isos(); ok(list3.includes(newIso) && !list3.includes(curIso), 'session moved in list');
  await tapSel(`.dpo-row[data-iso="${newIso}"]`);
  const moved = await p.evaluate(() => [...document.querySelectorAll('.sw-row')].slice(0, 3).map((r) => [...r.querySelectorAll('.sw-check')].pop().classList.contains('on')));
  ok(moved.every(Boolean), 'marks moved with the date');

  // 6 delete + undo
  await openPop(); const db = await p.locator(`.dpo-row[data-iso="${newIso}"]`).boundingBox();
  await touch('touchStart', db.x + 40, db.y + db.height / 2); await p.waitForTimeout(700); await touch('touchEnd'); await p.waitForTimeout(300);
  await tapSel('.dem-del'); const warn = await p.textContent('.dem-confirm p'); ok(/3 marks will be deleted\. You can undo\./.test(warn), `warning: "${warn}"`);
  await tapSel('.dem-confirm .danger'); await p.waitForTimeout(300);
  await openPop(); ok(!(await isos()).includes(newIso), 'deleted from list'); await tap(10, 905);
  await p.getByRole('button', { name: 'Undo', exact: true }).last().click(); await p.waitForTimeout(400);
  await openPop(); ok((await isos()).includes(newIso), 'Undo restores the session');
  await tapSel(`.dpo-row[data-iso="${newIso}"]`).catch(() => {});
  const back = await p.evaluate(() => [...document.querySelectorAll('.sw-row')].slice(0, 3).map((r) => [...r.querySelectorAll('.sw-check')].pop().classList.contains('on')));
  ok(back.every(Boolean), 'Undo restores the 3 marks');

  // 7 finger scroll in popover + popup
  await openPop();
  await p.$eval('.dpo-list', (e) => { e.style.maxHeight = '120px'; });
  const lr = await p.locator('.dpo-list').boundingBox();
  await drag(lr.x + 50, lr.y + lr.height - 10, 0, -90);
  ok((await p.$eval('.dpo-list', (e) => e.scrollTop)) > 0, 'popover list scrolls with a finger');
  await tap(10, 905);
  await openPop(); await tapSel('.dpo-add');
  await p.$eval('.dem', (e) => { e.style.maxHeight = '300px'; });
  const tb = await p.locator('.dem-note').boundingBox().catch(() => null);
  const [hx, hy] = await center('.dem-head');
  await drag(hx - 100, hy + 60, 0, -120);
  ok((await p.$eval('.dem', (e) => e.scrollTop)) > 0, 'popup scrolls with a finger (outside the dials)');
  ok(errs.length === 0, `no page errors ${errs.join(' | ')}`);
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
