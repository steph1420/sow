// v0.35.1 Install as app (t52u): iOS steps sheet, one-time nudge, Settings › App, hidden when standalone. 412x915 Night+Day.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4191/sow/';
const OUT = process.argv[3] || '/workspace/sow-mockups';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async () => {
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const mode of ['night', 'day']) {
    const { b, p } = await phone({ userAgent: IOS });
    const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((m) => { localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: m })) }, mode);
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const nudge = p.getByRole('dialog', { name: 'Install SoW' });
    ok(await nudge.isVisible(), mode + ': one-time nudge on first open');
    await p.screenshot({ path: `${OUT}/install-live-nudge-${mode}.png` });
    await tap(p.getByRole('button', { name: 'Not now' }));
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    ok(!(await nudge.isVisible().catch(() => false)), mode + ': nudge never returns');
    await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    const row = p.locator('.install-row');
    ok(await row.isVisible(), mode + ': Settings › App › Install as app');
    await row.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/install-live-settings-${mode}.png` });
    await tap(row);
    ok(await p.getByRole('dialog', { name: 'Add SoW to your Home Screen' }).isVisible(), mode + ': iOS steps sheet');
    await p.screenshot({ path: `${OUT}/install-live-ios-steps-${mode}.png` });
    await b.close();
  }
  // standalone → hidden
  const { b, p } = await phone({ userAgent: IOS });
  await p.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }) });
  await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(await p.locator('.install-row').count() === 0 && await p.getByRole('dialog', { name: 'Install SoW' }).count() === 0, 'standalone: row + nudge hidden');
  await b.close();
  console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
