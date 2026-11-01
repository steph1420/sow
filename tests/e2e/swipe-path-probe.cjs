// v0.46.0 (Steve t5u) — swipe highlights each box it passes, lift ticks only lit boxes, going back un-lights, back to start cancels.
// REAL touch via CDP at 412x915. Demo data only. Usage: node tests/e2e/swipe-path-probe.cjs [url]
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const cell = (roll, col) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2]; }, col);
  const state = () => p.$$eval('.sw-row[data-roll]', (rows) => Object.fromEntries(rows.map((r) => [r.dataset.roll, [...r.querySelectorAll('.sw-check')].map((c) => c.classList.contains('on'))])));
  const lit = () => p.$$eval('.sw-row[data-roll]', (rows) => rows.flatMap((r) => [...r.querySelectorAll('.sw-check')].map((c, i) => (c.classList.contains('tgt') ? `${r.dataset.roll}|${i}` : null)).filter(Boolean)));
  const glide = async (pts) => { for (const [x, y] of pts) { await touch('touchMove', x, y); await p.waitForTimeout(24); } };
  const fresh = async () => {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); });
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    vis = new Set(await p.$$eval('.sw-row[data-roll]', (rows) => rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top > 180 && b.bottom < 640; }).map((r) => r.dataset.roll)));
  };
  let vis = new Set();
  const clean = (s) => Object.keys(s).filter((r) => vis.has(r) && +r > 2 && s[r].every((v) => !v) && s[+r + 1] && s[+r + 1].every((v) => !v) && s[+r + 2] && s[+r + 2].every((v) => !v))[0];
  // lit boxes all end at the swipe value (a row not fully ticked → tick); everything else is untouched
  const onlyLit = (a, b2, litKeys) => { const v = !a[r].every(Boolean); return Object.keys(b2).every((k) => b2[k].every((x, i) => (litKeys.includes(`${k}|${i}`) ? x === v : x === a[k][i]))); };
  const changed = (a, b2) => Object.keys(b2).flatMap((r) => b2[r].map((v, i) => (a[r] && a[r][i] !== v ? `${r}|${i}` : null)).filter(Boolean));

  // A — across both boxes of one row: both light up while held, both tick on lift
  await fresh();
  let before = await state(); let r = '3';
  let [x0, y0] = await cell(r, 0); let [x1] = await cell(r, 1);
  await touch('touchStart', x0, y0);
  await glide([[x0 + 12, y0], [x0 + 24, y0], [(x0 + x1) / 2, y0], [x1, y0], [x1 + 6, y0]]);
  ok(JSON.stringify(await lit()) === JSON.stringify([`${r}|0`, `${r}|1`]), `A hold: both boxes of row ${r} lit (${await lit()})`);
  const wash = await p.$eval(`.sw-row[data-roll="${r}"]`, (e) => e.className.includes('pc-wash'));
  ok(wash, 'A hold: trailing wash class on the row (default style)');
  await touch('touchEnd'); await p.waitForTimeout(300);
  ok((await lit()).length === 0, 'A release: highlight cleared at once');
  ok(onlyLit(before, await state(), [`${r}|0`, `${r}|1`]), `A lift: exactly the lit boxes set (changed ${changed(before, await state())})`);

  // B — down 2 rows in column 2, then back up: rows below un-light, only the start row ticks
  await fresh();
  before = await state(); r = '3';
  [x0, y0] = await cell(r, 0); [x1] = await cell(r, 1);
  const [, yDown] = await cell(+r + 2, 1);
  await touch('touchStart', x0, y0);
  await glide([[x0 + 14, y0], [x0 + 28, y0], [x1, y0], [x1, y0 + (yDown - y0) / 2], [x1, yDown], [x1, yDown + 2]]);
  const litDown = await lit();
  ok(litDown.includes(`${+r + 1}|1`) && litDown.includes(`${+r + 2}|1`) && !litDown.includes(`${+r + 1}|0`), `B down: passed boxes lit in column 2 only (${litDown})`);
  await glide([[x1, yDown - 20], [x1, y0 + 20], [x1, y0], [x1, y0 - 2]]);
  ok(JSON.stringify(await lit()) === JSON.stringify([`${r}|0`, `${r}|1`]), `B back up: rows below un-lit (${await lit()})`);
  await touch('touchEnd'); await p.waitForTimeout(300);
  ok(onlyLit(before, await state(), [`${r}|0`, `${r}|1`]), `B lift: only row ${r} set, rows below untouched (changed ${changed(before, await state())})`);

  // C — across then all the way back past the start: cancelled, nothing changes
  await fresh();
  before = await state(); r = '3';
  [x0, y0] = await cell(r, 0); [x1] = await cell(r, 1);
  await touch('touchStart', x0, y0);
  await glide([[x0 + 14, y0], [x0 + 28, y0], [x1, y0], [x0 + 10, y0], [x0, y0], [x0 - 8, y0]]);
  ok(JSON.stringify(await lit()) === JSON.stringify([`${r}|0`]), `C back at start: only the start box lit (${await lit()})`);
  await touch('touchEnd'); await p.waitForTimeout(300);
  ok(changed(before, await state()).length === 0, 'C lift: swipe cancelled, nothing ticked');

  // D — plain tap still toggles one box
  await fresh();
  before = await state(); r = '3'; [x0, y0] = await cell(r, 0);
  await touch('touchStart', x0, y0); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(JSON.stringify(changed(before, await state())) === JSON.stringify([`${r}|0`]), 'D tap: one box toggled');

  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
