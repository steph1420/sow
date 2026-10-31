// v0.36.0 prefs sync (t52u): routed fake bridge. Old bridge → "Update bridge script"; new bridge → first-join choice → synced applied.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4191/sow/';
const OUT = process.argv[3] || '/workspace/sow-mockups';
const TOK = 'probe-token-ABCD7Kq2';
(async () => {
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const mode of ['night', 'day']) {
    const { b, ctx, p } = await phone();
    let old = true; const sheet = [{ key: 'palette', category: 'appearance', value: '3-sky', updatedAt: '2026-10-29T18:00:00.000Z', deviceId: 'A' }, { key: 'sync.yearStartMonth', category: 'year', value: 6, updatedAt: '2026-10-29T18:00:00.000Z', deviceId: 'A' }];
    const posted = [];
    await ctx.route('https://script.google.com/**', async (r) => {
      const body = JSON.parse(r.request().postData() || '{}'); posted.push(body);
      const send = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (body.action === 'pairClaim') return send({ ok: true, token: TOK, version: '0.36.0' });
      if (body.action === 'prefsPush' || body.action === 'prefsPull') {
        if (old) return send({ ok: false, error: 'unknown action', version: '0.34.0' });
        for (const x of body.rows || []) { const i = sheet.findIndex((y) => y.key === x.key); const n = { ...x, deviceId: body.deviceId }; if (i < 0) sheet.push(n); else if (x.updatedAt > sheet[i].updatedAt) sheet[i] = n; }
        return send({ ok: true, prefs: sheet, version: '0.36.0' });
      }
      return send({ ok: true, schema: 1, version: '0.36.0', subjects: [], roster: [], sessions: [], ticks: [] });
    });
    const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(([m]) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: m })); localStorage.setItem('sow-app.installNudgeSeen', 'x'); }, [mode]);
    await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    ok(await p.getByText('Pair this device to sync settings').isVisible(), mode + ': unpaired hint');
    // pair via Join with a code (built-in bridge URL)
    await tap(p.getByRole('button', { name: /Join with a code/ }));
    await tap(p.getByLabel('Digit 1')); await p.keyboard.type('482913');
    await tap(p.getByRole('button', { name: 'Pair', exact: true }));
    await p.waitForFunction(() => /Paired/.test(document.body.textContent), null, { timeout: 10000 });
    await p.waitForTimeout(800);
    await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const alert = p.getByText(/Update bridge script/);
    ok(await alert.isVisible(), mode + ': old bridge → Update bridge script');
    await p.locator('.prefsync-card').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/prefsync-live-old-bridge-${mode}.png` });
    ok(posted.filter((x) => x.action === 'prefsPush').every((x) => (x.rows || []).every((r) => !/token|url|haptics|reduceMotion/i.test(r.key))), mode + ': rows carry no token/URLs/haptics');
    // new bridge
    old = false;
    await tap(p.getByRole('button', { name: 'Sync settings now' }));
    const sheetDlg = p.getByRole('dialog', { name: 'Which settings?' });
    await sheetDlg.waitFor({ timeout: 5000 }).catch(() => {});
    ok(await sheetDlg.isVisible(), mode + ': first join asks Which settings?');
    ok((await p.getByRole('radio', { name: /Use synced settings/ }).getAttribute('aria-checked')) === 'true', mode + ': default = Use synced settings');
    await p.screenshot({ path: `${OUT}/prefsync-live-choice-${mode}.png` });
    await tap(p.getByRole('button', { name: 'Continue' }));
    await p.waitForTimeout(1200);
    ok((await p.evaluate(() => document.documentElement.dataset.palette)) === '3-sky', mode + ': synced palette applied live');
    const ls = await p.evaluate(() => JSON.parse(localStorage.getItem('sow-app.prefs.v1'))['sync.yearStartMonth']);
    ok(ls === 6, mode + ': academic year applied (always synced)');
    ok(await p.getByText('Always synced').isVisible(), mode + ': Academic year fixed row');
    const dev = p.getByRole('switch', { name: 'Developer options' });
    ok((await dev.getAttribute('aria-checked')) === 'false', mode + ': Developer options default off');
    ok(await p.getByRole('switch', { name: 'Night / Day' }).isVisible(), mode + ': Night/Day toggle');
    await p.locator('.prefsync-card').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/prefsync-live-card-${mode}.png` });
    ok(!sheet.some((x) => /token|url|haptics|reduceMotion/i.test(x.key)), mode + ': sheet has no token/URL/device-only keys');
    await b.close();
  }
  console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
