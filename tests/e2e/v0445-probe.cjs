// v0.44.5 (t57u/t58u option A LOCKED) — date popover active rows: no fill, thin green left bar, green date, ✓ right,
// identical on every shown date; columns oldest-first after picks/swap; past view header strip tinted amber; sync URLs masked.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const tap = async (sel, nth = 0) => { const r = await p.locator(sel).nth(nth).boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300); };
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const isoHeads = () => p.$$eval('.sw-dh-btn', (e) => e.map((x) => x.getAttribute('aria-label')));
  await tap('.sw-dh-btn', 0); await p.waitForSelector('.dpo-row');
  const rows = await p.$$eval('.dpo-row', (rs) => rs.map((r) => { const cs = getComputedStyle(r), bf = getComputedStyle(r, '::before'), d = getComputedStyle(r.querySelector('.dpo-date'));
    return { iso: r.dataset.iso, bg: cs.backgroundColor, bar: bf.content !== 'none' && bf.content !== '' ? bf.width : '', date: d.color, ck: !!r.querySelector('.dpo-ck'), txt: r.querySelector('.dpo-date').textContent }; }));
  const act = rows.filter((r) => r.ck), plain = rows.filter((r) => !r.ck);
  ok(act.length === 2, `2 active rows with ✓ at right (${act.length})`);
  ok(rows.every((r) => /rgba\(0, 0, 0, 0\)|transparent/.test(r.bg)), `no filled background on any row (${[...new Set(rows.map((r) => r.bg))]})`);
  ok(act.every((r) => r.bar === '3px'), `thin 3px left bar on every active row (${act.map((r) => r.bar)})`);
  ok(new Set(act.map((r) => r.date)).size === 1 && plain.every((r) => r.date !== act[0].date), 'same green date text on every active row, plain rows not green');
  ok(rows.every((r) => !r.txt.includes('✓')), '✓ no longer inside the date text');
  ok(!!(await p.$('.dpo-add')) && !!(await p.$('.dpo-cols')), 'Add Date pill + 1/2 toggle kept');
  await tap('.dpo-row', rows.length - 1); await p.waitForTimeout(300);
  const dates = await p.$$eval('.sw-colhead .sw-dh-date', (e) => e.map((x) => x.textContent));
  const toIso = (dm) => { const [d, m] = dm.split('/').map(Number); return (m < 8 ? 2027 : 2026) * 1e4 + m * 100 + d; };
  ok(dates.length === 2 && toIso(dates[0]) < toIso(dates[1]), `columns oldest-first after pick (${dates})`);
  await tap('.sw-dh-btn', 1); await p.waitForSelector('.dpo-row'); const other = await p.$$eval('.dpo-row', (r) => r.findIndex((x) => x.querySelector('.dpo-ck') && x.classList.contains('cur')));
  const ix = await p.$$eval('.dpo-row', (r) => r.findIndex((x) => x.querySelector('.dpo-ck') && !x.classList.contains('cur')));
  if (ix >= 0) await tap('.dpo-row', ix); else if (other >= 0) await tap('.dpo-row', 0); await p.waitForTimeout(300);
  const d2 = await p.$$eval('.sw-colhead .sw-dh-date', (e) => e.map((x) => x.textContent));
  ok(d2.length === 2 && toIso(d2[0]) < toIso(d2[1]), `columns oldest-first after swap (${d2})`);
  // past view header strip
  await p.evaluate(() => localStorage.setItem('sow.dateCols', '1')); // 1-date view ⇒ the oldest row is a past date
  await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.locator('.ov-card').filter({ hasText: 'KGB' }).first().locator('.top').tap(); await p.waitForSelector('.ad-row');
  await tap('.ad-add'); await p.waitForSelector('.dem'); // add an older (previous month) date so a past row exists
  await p.$eval('.dp-dials [data-dial=month]', (e) => e.focus()); await p.keyboard.press('ArrowDown');
  await p.fill('.dem-topic', 'Older demo topic'); await tap('.dem-ok'); await p.waitForTimeout(400);
  await tap('.ad-row', (await p.$$('.ad-row')).length - 1); await p.waitForTimeout(700);
  const past = !!(await p.$('.sw-page.past'));
  const bg = await p.$eval('.sw-colhead-bar', (e) => getComputedStyle(e).backgroundColor).catch(() => '');
  const page = await p.$eval('.sw-page', (e) => getComputedStyle(e).backgroundColor).catch(() => '?');
  ok(past && bg === page, `past view header strip tinted like the page (${bg} vs ${page})`);
  // masked URLs
  const B = 'https://script.google.com/macros/s/AKfycbDEMOdemoDEMOdemoDEMOdemo1234567890/exec';
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); });
  await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.fill('input[name=sow-sync-url]', B); await p.locator('input[name=sow-sheet-url]').focus(); await p.waitForTimeout(150);
  const shown = await p.inputValue('input[name=sow-sync-url]');
  ok(!shown.includes('AKfycbDEMOdemo'), `sync URL masked when not editing ("${shown}")`);
  await p.locator('input[name=sow-sync-url]').focus(); await p.waitForTimeout(150); ok((await p.inputValue('input[name=sow-sync-url]')) === B, 'full URL back while editing');
  const beta = p.locator('[data-testid=beta-url]');
  if (await beta.count()) { await beta.fill(B); await p.locator('input[name=sow-sheet-url]').focus(); await p.waitForTimeout(150); ok(!(await beta.inputValue()).includes('AKfycbDEMOdemo'), 'Beta URL field masked when not editing'); }
  else ok(false, 'Beta URL field masked (field missing testid)');
  await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
