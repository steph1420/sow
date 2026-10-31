// v0.44.3 (t55u) — tapping a column-header date and picking dates (incl. the other column's) never adds/duplicates columns. REAL touch, demo data.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const tap = async (sel, nth = 0) => { const r = await p.locator(sel).nth(nth).boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(250); };
  const heads = () => p.$$eval('.sw-colhead .sw-dh-date', (e) => e.map((x) => x.textContent));
  const cells = () => p.$eval('.sw-row', (r) => r.querySelectorAll('.sw-check').length);
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  ok((await heads()).length === 2, `start: 2 header columns (${await heads()})`);
  for (let i = 0; i < 6; i++) {
    const n = (await heads()).length;
    await tap('.sw-dh-btn', n - 1); await p.waitForSelector('.dpo');
    const isos = await p.$$eval('.dpo-row', (e) => e.map((x) => x.dataset.iso));
    await tap('.dpo-row', i % isos.length);
    if (await p.$('.dpo')) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
    const h = await heads();
    ok(h.length >= 1 && h.length <= 2 && new Set(h).size === h.length, `pick #${i + 1}: ${h.length} unique header column(s) [${h}]`);
    ok((await cells()) === h.length, `pick #${i + 1}: row cells match header columns (${await cells()})`);
  }
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
