// v0.38.0 (t68u) — 1-date view never touches the hidden date: row swipe, name swipe, tap, undo/redo (REAL touch via CDP).
const pillToggle = async (p, hide) => { // v0.40.0: date chips moved into the Dates panel — same toggle semantics
  const two = (await p.$$eval('.sw-colhead .sw-dh', (e) => e.length)) === 2;
  await p.$eval('.sw-lean-dates', (e) => e.click()); await p.waitForTimeout(200); // header may be auto-hidden after scrolling
  if (two) { await p.click(`.dp-slot >> nth=${hide === 1 ? 0 : 1}`); await p.click('.dp-one'); } // v0.42.0 Q-DATES-A: target a slot, then "1 date only"
  else await p.click('.dp-one'); // reads "2 dates" in 1-date view
  await p.click('.dp-sheet .qo-close'); await p.waitForTimeout(150);
};

const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const swipe = async (x, y, dx) => { await touch('touchStart', x, y); for (let i = 1; i <= 6; i++) { await touch('touchMove', x + (dx * i) / 6, y); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(500); };
  const col = (i) => p.$$eval('.sw-row', (rows, i) => rows.map((r) => r.querySelectorAll('.sw-check')[i]?.classList.contains('on') ? 1 : 0).join(''), i);
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  for (const [hide, label] of [[0, 'B'], [1, 'A']]) {
    const hidden0 = await col(hide);
    await pillToggle(p, hide); await p.waitForTimeout(200);
    const vis0 = await col(0);
    const rows = await p.$$eval('.sw-row', (r) => r.slice(3, 7).map((x) => { const c = x.querySelector('.sw-check-hit').getBoundingClientRect(); const n = x.querySelector('.sw-name').getBoundingClientRect(); return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, nx: n.left + n.width * 0.75, ny: n.top + n.height / 2 }; }));
    await swipe(rows[0].cx - 20, rows[0].cy, 60);          // ✓-cell row swipe
    await swipe(rows[1].nx, rows[1].ny, rows[1].cx - rows[1].nx + 40); // name swipe across the box
    await touch('touchStart', rows[2].cx, rows[2].cy); await touch('touchEnd'); await p.waitForTimeout(300); // tap
    const vis1 = await col(0); ok(vis1 !== vis0, `date ${label} view: gestures did change the visible date (${[...vis0].filter((c, i) => c !== vis1[i]).length} boxes)`);
    await p.click('[aria-label="Undo"]'); await p.click('[aria-label="Redo"]'); await p.waitForTimeout(200);
    await pillToggle(p, hide); await p.waitForTimeout(200);
    ok((await col(hide)) === hidden0, `date ${label} view: swipe / name swipe / tap / undo-redo left hidden date untouched`);
    // clean up visible changes
    for (let i = 0; i < 4; i++) { if (await p.isEnabled('[aria-label="Undo"]')) await p.click('[aria-label="Undo"]'); }
  }
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
