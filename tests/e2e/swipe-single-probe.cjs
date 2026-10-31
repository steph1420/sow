// t167u — fast diagonal swipe on ✓ columns, REAL touch (CDP). Toggle ON → exactly 1 row; OFF → extends to rows below.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const cell = (roll, col) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2]; }, col);
  const rowOn = () => p.$$eval('.sw-row', (rows) => Object.fromEntries(rows.map((r) => [r.dataset.roll, [...r.querySelectorAll('.sw-check')].every((c) => c.classList.contains('on'))])));
  const run = async (single) => {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((single) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ 'gestures.swipeSingleRow': single })); }, single);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    const before = await rowOn();
    const start = Object.keys(before).find((r) => !before[r] && +r > 2 && !before[+r + 1] && !before[+r + 2]);
    const [x, y] = await cell(start, 0); const [x2] = await cell(start, 1);
    // fast diagonal: 6 moves, ~16ms, ends ~2 rows lower
    await touch('touchStart', x, y);
    // starts sideways (axis locks horizontal), then drifts ~2 rows down while still moving right
    const pts = [[x + 14, y + 3], [x + 28, y + 10], [x2 - 10, y + 40], [x2, y + 75], [x2 + 10, y + 115]];
    for (const [px, py] of pts) { await touch('touchMove', px, py); await p.waitForTimeout(16); }
    const pend = await p.$$eval('.sw-row', (rows) => rows.filter((r) => r.querySelectorAll('.sw-check.pending').length === r.querySelectorAll('.sw-check').length && r.querySelector('.sw-check.pending')).map((r) => r.dataset.roll));
    const blue = await p.$eval('.sw-check.pending', (e) => getComputedStyle(e).borderColor).catch(() => '');
    await touch('touchEnd'); await p.waitForTimeout(60);
    const pendAfter = await p.$$eval('.sw-check.pending, .sw-row.paint-glow', (e) => e.length);
    ok(pend.includes(start) && (single ? pend.length === 1 : pend.length > 1) && /rgb\(76, 155, 255\)/.test(blue), `t168u hold: blue pending on both cols of rows ${pend} (${blue})`);
    ok(pendAfter === 0, 't168u release: pending blue cleared instantly');
    await p.waitForTimeout(440);
    const after = await rowOn();
    const changed = Object.keys(after).filter((r) => after[r] !== before[r]);
    return { start, changed };
  };
  const on = await run(true);
  ok(on.changed.length === 1 && on.changed[0] === on.start, `toggle ON: fast diagonal ticks exactly row ${on.start} → changed ${on.changed}`);
  const off = await run(false);
  ok(off.changed.length > 1 && off.changed.includes(off.start), `toggle OFF: drift extends (changed ${off.changed})`);
  // Dev toggle exists
  await p.goto(url + '#settings/dev', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  ok(/Swipe ticks one row only/.test(await p.locator('.dev-swipe-single').innerText()), 'Settings → Dev has "Swipe ticks one row only"');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
