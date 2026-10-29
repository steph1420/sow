// v0.34.0 setup pairing (setuppair-mj1, LOCKED t39u): real touch at 412x915 against a routed fake bridge.
// Host: Pair a device → 6-digit code + countdown, Cancel → pairCancel. Join: URL + code → token saved, Sync runs.
// Export → .sowsetup download; Import → confirm sheet (masked token) → Apply after ping.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4191/sow/';
const EXEC = 'https://script.google.com/macros/s/AKfyPROBE_x/exec';
const TOK = 'probe-token-ABCD7Kq2';
(async () => {
  const { b, ctx, p } = await phone({ acceptDownloads: true });
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const calls = []; let code = null;
  await ctx.route('https://script.google.com/**', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}'); calls.push(body.action);
    const send = (o) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '0.34.0', ...o }) });
    if (body.action === 'pairClaim') { if (body.code === code) { code = null; return send({ ok: true, token: TOK }) } return send({ ok: false, error: 'wrong code', triesLeft: 4 }) }
    if (body.token !== TOK) return send({ ok: false, error: 'bad token' });
    if (body.action === 'pairStart') { code = '482913'; return send({ ok: true, code, expiresInSec: 300 }) }
    if (body.action === 'pairCancel') { code = null; return send({ ok: true }) }
    if (body.action === 'ping') return send({ ok: true, schema: 1 });
    if (body.action === 'pull' || body.action === 'push') return send({ ok: true, schema: 1, subjects: [{ subjectKey: 'KGA_Eng_CW', classKey: 'KGA', subject: 'Eng', kind: 'CW', active: true }], roster: [{ classKey: 'KGA', roll: 1, name: 'Demo One', status: 'Active', updatedAt: '' }], sessions: [], ticks: [], applied: 0, ignored: 0, rejected: [], state: { ok: true, schema: 1, subjects: [], roster: [], sessions: [], ticks: [] } });
    return send({ ok: false, error: 'unknown action' });
  });
  const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  const go = async () => { await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400); };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await go();
  const pairBtn = p.getByRole('button', { name: /Pair a device/ });
  ok(await pairBtn.isDisabled(), 'Pair a device disabled without URL+token');
  ok(await p.getByText('Other devices').isVisible(), 'Other devices card shown');
  ok(await p.getByText('Hidden · saved on this device only').isVisible(), 'token hint shown');

  // ── Join (new device)
  await tap(p.getByRole('button', { name: /Join with a code/ }));
  await p.fill('input[name=sow-join-url]', EXEC);
  code = '482913';
  await tap(p.getByLabel('Digit 1')); await p.keyboard.type('000000');
  await tap(p.getByRole('button', { name: 'Pair', exact: true }));
  await p.getByRole('alert').waitFor();
  ok(/Wrong code · 4 tries left/.test(await p.getByRole('alert').textContent()), 'wrong code → tries left shown');
  for (let i = 6; i >= 1; i--) { await p.getByLabel('Digit ' + i).fill(''); }
  await tap(p.getByLabel('Digit 1')); await p.keyboard.type('482913');
  const box = await p.getByLabel('Digit 6').boundingBox();
  ok(box.width >= 44 && box.height >= 44, 'digit boxes ≥44px');
  await tap(p.getByRole('button', { name: 'Pair', exact: true }));
  await p.waitForFunction(() => /Paired/.test(document.body.textContent), null, { timeout: 10000 });
  await p.waitForTimeout(800);
  ok(calls.includes('pairClaim') && calls.includes('pull'), 'paired then synced via bridge: ' + calls.join(','));
  const saved = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('sow-app'); r.onsuccess = () => { const db = r.result; const st = [...db.objectStoreNames].find((n) => /setting/i.test(n)); const g = db.transaction(st).objectStore(st).getAll(); g.onsuccess = () => res(g.result) } }));
  const s0 = Array.isArray(saved) ? saved[0] : {};
  ok(s0 && s0.syncUrl === EXEC && s0.bridgeToken === TOK, 'URL + token saved on this device');

  // ── Host
  await go();
  ok(await p.locator('input[name=sow-bridge-token]').getAttribute('type') === 'password', 'token field masked');
  await tap(p.getByRole('button', { name: /Pair a device/ }));
  await p.waitForFunction(() => /482 913/.test(document.querySelector('[data-testid=pair-code]')?.textContent || ''));
  ok(true, 'host shows 482 913');
  const t1 = await p.locator('[role=timer]').textContent();
  ok(/^(5:00|4:5\d)$/.test(t1), 'countdown starts at 5:00: ' + t1);
  await p.waitForTimeout(1300);
  const t2 = await p.locator('[role=timer]').textContent();
  ok(t2 !== t1, 'countdown ticks: ' + t2);
  ok(await p.getByText('One use · expires in 5 min').isVisible(), 'one use copy');
  await tap(p.getByRole('button', { name: 'Cancel', exact: true }));
  await p.waitForTimeout(400);
  ok(calls.includes('pairCancel'), 'Cancel calls pairCancel');
  ok(await p.getByText('Other devices').isVisible(), 'back on Sync');

  // ── Export: share sheet when the phone can share files, else a download
  await p.evaluate(() => { window.__shared = []; Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true }); Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__shared.push(d.files[0].name) } }) });
  await tap(p.getByRole('button', { name: 'Export', exact: true }));
  await p.getByText(/Shared setup file/).waitFor({ timeout: 5000 });
  ok((await p.evaluate(() => window.__shared))[0] === 'sow-setup.sowsetup', 'export opens the share sheet with sow-setup.sowsetup');
  await p.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }) });
  const dl = p.waitForEvent('download');
  await tap(p.getByRole('button', { name: 'Export', exact: true }));
  const d = await dl; const fp = await d.path(); const txt = require('fs').readFileSync(fp, 'utf8');
  const f = JSON.parse(txt);
  ok(d.suggestedFilename() === 'sow-setup.sowsetup' && f.kind === 'sow-setup' && f.syncUrl === EXEC && f.token === TOK, 'export .sowsetup with URL + token');

  // ── Import on a clean device
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); }); await go();
  await p.locator('[data-testid=setup-file]').setInputFiles({ name: 'sow-setup.sowsetup', mimeType: 'application/json', buffer: Buffer.from(txt) });
  await p.getByRole('dialog').waitFor();
  const dlg = await p.getByRole('dialog').textContent();
  ok(/ends 7Kq2/.test(dlg) && !dlg.includes(TOK), 'confirm sheet masks the token');
  await tap(p.getByRole('button', { name: 'Apply', exact: true }));
  await p.getByText('Setup imported · tap Sync now').waitFor({ timeout: 8000 });
  ok(calls.filter((c) => c === 'ping').length === 1, 'Apply pinged the bridge');
  ok(await p.locator('input[name=sow-sync-url]').inputValue() === EXEC, 'imported URL in field');
  await p.locator('[data-testid=setup-file]').setInputFiles({ name: 'x.sowsetup', mimeType: 'text/plain', buffer: Buffer.from('nope') });
  ok(await p.getByText('Not a SoW setup file').isVisible(), 'junk file rejected');
  await p.screenshot({ path: '/tmp/setup-pair-probe.png' });
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
