// v0.47.0/0.47.1 probe: pending grace (display-only, tick persists across a reload mid-grace), overlay panel, Push A–Z ON/OFF.
// Run against a local build: SOW_URL=http://localhost:4318/sow/ node tests/e2e/v047-probe.cjs   (demo data only; no sheet)
const { phone } = require('./_launch.cjs');
const U = process.env.SOW_URL || 'http://localhost:4318/sow/';
const PK = process.env.SOW_PREFS_KEY || 'sow-app.prefs.v1';
const fail = []; const ok = (c, m) => { if (!c) fail.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const { b, p } = await phone();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const open = async () => { await p.goto(U + '#checklist/KGA_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200); };
  const pending = async () => { await p.click('button[aria-label="More actions"]'); await p.click('[data-item=pending]'); await p.waitForTimeout(300); };
  await open(); await pending();
  const roll = (await p.locator('.sw-rows .sw-row .sw-check-hit[aria-checked=false]').first().getAttribute('aria-label')).match(/roll (\d+)/)[1];
  const row = `.sw-rows .sw-row[data-roll="${roll}"]`;
  for (const c of await p.locator(`${row} .sw-check-hit[aria-checked=false]`).all()) await c.tap();
  await p.waitForTimeout(400);
  ok(await p.locator(`${row}.grace`).count() === 1, 'grace: ticked row stays, in grace');
  ok(await p.locator(`${row} .sw-check-hit[aria-checked=false]`).count() === 0, 'grace: tick shows at once');
  await p.waitForTimeout(400);
  await open(); // app closes/reloads mid-grace
  ok(await p.locator(`${row} .sw-check-hit[aria-checked=false]`).count() === 0 && await p.locator(row).count() === 1, 'persist: tick survived reload mid-grace');
  await pending();
  ok(await p.locator(row).count() === 0, 'persist: row is done (hidden in Pending after reload)');
  // cancel path
  const r2 = (await p.locator('.sw-rows .sw-row .sw-check-hit[aria-checked=false]').first().getAttribute('aria-label')).match(/roll (\d+)/)[1];
  const row2 = `.sw-rows .sw-row[data-roll="${r2}"]`;
  const cells = await p.locator(`${row2} .sw-check-hit[aria-checked=false]`).all();
  for (const c of cells) await c.tap();
  await p.waitForTimeout(300); await p.locator(`${row2} .sw-check-hit`).last().tap(); await p.waitForTimeout(3600);
  ok(await p.locator(row2).count() === 1 && await p.locator(`${row2}.grace`).count() === 0, 'cancel: tapping again keeps the row');
  // panel (v0.47.1 t127u): manual collapse only
  const w = p.locator('.sw-list-wrap'); const y = () => p.evaluate(() => document.querySelector('.sw-rows .sw-row:nth-child(8)').getBoundingClientRect().top);
  const collapsed = async () => (await p.locator('.sw-chrome.stuck').count()) === 1;
  await w.evaluate((e) => { e.scrollTop = 0 }); await p.waitForTimeout(300);
  await w.evaluate((e) => { e.scrollTop = 300 }); await p.waitForTimeout(400);
  ok(!(await collapsed()), 'panel: scrolling down does not hide it');
  const y1 = await y(); await p.click('.sw-panel-toggle'); await p.waitForTimeout(400); const y2 = await y();
  ok(await collapsed(), 'panel: chevron collapses'); ok(y1 === y2, `panel: rows did not shift (${y2 - y1}px)`);
  const tb = await p.locator('.sw-panel-toggle').boundingBox();
  ok(tb && tb.width >= 44 && tb.height >= 44 && tb.y >= 0, 'panel: chevron reachable when collapsed, ≥44px');
  await w.evaluate((e) => { e.scrollTop = e.scrollHeight }); await p.waitForTimeout(300);
  const before = await w.evaluate((e) => e.scrollTop);
  await p.locator('.sw-az-slot').first().tap(); await p.waitForTimeout(900);
  const after = await w.evaluate((e) => e.scrollTop);
  ok(after < before, `A–Z jump scrolled up (${before}→${after})`);
  ok(await collapsed(), 'panel: A–Z jump upward keeps it collapsed (t127u bug)');
  await w.evaluate((e) => { e.scrollTop = 0 }); await p.waitForTimeout(300);
  ok(await collapsed(), 'panel: reaching the top keeps it collapsed');
  const azVsChrome = () => p.evaluate(() => document.querySelector('.sw-az').getBoundingClientRect().top - document.querySelector('.sw-chrome').getBoundingClientRect().bottom);
  ok((await azVsChrome()) < 0, 'A–Z OFF collapsed: panel overlays strip top');
  await open();
  ok(await collapsed(), 'panel: collapsed state remembered after reload');
  await p.keyboard.press('Tab'); await p.focus('.sw-panel-toggle'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok(!(await collapsed()), 'panel: keyboard Enter expands');
  ok((await azVsChrome()) < 0, 'A–Z OFF expanded: panel overlays strip top');
  await p.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k) || '{}'); s['az.pushBelowPanel'] = true; localStorage.setItem(k, JSON.stringify(s)) }, PK);
  await open();
  ok((await azVsChrome()) >= 0, 'A–Z ON expanded: strip below panel');
  await p.click('.sw-panel-toggle'); await p.waitForTimeout(400);
  ok((await azVsChrome()) >= 0, 'A–Z ON collapsed: strip below visible header');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); process.exit(fail.length ? 1 : 0);
})();
