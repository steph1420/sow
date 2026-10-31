// v0.36.1 clock guard (t55u): bridge serverNow a day behind the phone → Sync page warns. 412x915 Night+Day.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4191/sow/';
const OUT = process.argv[3] || '/workspace/sow-mockups';
(async () => {
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const mode of ['night', 'day']) {
    const { b, ctx, p } = await phone();
    await ctx.route('https://script.google.com/**', (r) => {
      const body = JSON.parse(r.request().postData() || '{}');
      const o = body.action === 'pairClaim' ? { ok: true, token: 'probe-tok' } : body.action === 'prefsPush' ? { ok: true, prefs: [] } : { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...o, version: '0.36.1', serverNow: new Date(Date.now() - 864e5).toISOString() }) });
    });
    const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((m) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: m })); localStorage.setItem('sow-app.installNudgeSeen', 'x'); }, mode);
    await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    ok(await p.locator('.clock-warn').count() === 0, mode + ': no warning before any bridge reply');
    await tap(p.getByRole('button', { name: /Join with a code/ }));
    await tap(p.getByLabel('Digit 1')); await p.keyboard.type('123456');
    await tap(p.getByRole('button', { name: 'Pair', exact: true }));
    await p.waitForFunction(() => /Paired/.test(document.body.textContent), null, { timeout: 10000 });
    await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    const w = p.locator('.clock-warn');
    ok(await w.isVisible() && /1 day fast/.test(await w.textContent()), mode + ': warns "1 day fast"');
    const dlg = p.getByRole('dialog'); if (await dlg.count()) await p.getByRole('button', { name: 'Not now' }).click().catch(() => {});
    await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `${OUT}/clock-live-warn-${mode}.png` });
    await b.close();
  }
  console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
