// v0.46.0 — Beta app against the TEST copy bridge (whatever version it runs): connection check, sync, no writes.
// TEST copy ONLY (refuses unless on the Beta channel). Token from SOW_TEST_BRIDGE_TOKEN, never printed.
const { phone, betaInit, setTestCopy } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone(); await betaInit(ctx); p.setDefaultTimeout(30000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  await setTestCopy(p, url);
  await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.locator('.conn-check').click();
  await p.waitForSelector('.conn-result, .conn-error', { timeout: 60000 });
  const res = await p.$eval('.conn-result', (e) => ({ label: e.dataset.label, version: e.dataset.version, text: e.textContent })).catch(() => null);
  ok(res && res.label === 'TEST copy', `connection check: sheet label ${res && res.label}`);
  ok(res && /^\d+\.\d+\.\d+$/.test(res.version), `connection check: bridge version ${res && res.version}`);
  console.log('INFO ' + (res ? res.text : 'no result'));
  const sync = p.getByRole('button', { name: /^Sync now/ }).first();
  await sync.click();
  await p.waitForFunction(() => /pulled \d+ students/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
  const txt = await p.evaluate(() => document.body.innerText);
  ok(/pulled \d+ students · \d+ marks/.test(txt), 'Sync now via the bridge succeeded (' + ((txt.match(/(Pushed|Nothing to push)[^\n]*/) || [''])[0]) + ')');
  ok(/Nothing to push/.test(txt), 'fresh Beta device pushes nothing (sheet wins on first pull)');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(String(e).replace(/token[^,}]*/gi, 'token:***')); process.exit(2); });
