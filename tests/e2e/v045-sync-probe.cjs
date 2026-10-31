// v0.45.0 end-to-end auto-save + restore against the TEST copy ONLY (Beta channel, SOW_TEST_BRIDGE_TOKEN from env,
// never printed). Untick one ticked cell → auto-save pushes it after the 2 s pause (sheet 216 → 215 ticked) →
// restore the Back-up-now snapshot → the sheet is back to 216 and the tick doesn't vanish again on the next pull.
const L = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const pull = async () => { const r = await fetch(L.TEST_EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: process.env.SOW_TEST_BRIDGE_TOKEN, action: 'pull' }), redirect: 'follow', signal: AbortSignal.timeout(60000) }); const s = await r.json(); return { sessions: s.sessions.length, rows: s.ticks.length, ticked: s.ticks.filter((t) => t.set === true).length }; };
(async () => {
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const base = await pull();
  if (base.sessions !== 7 || base.rows !== 311 || base.ticked !== 216) { console.error('TEST copy not at baseline, refusing', JSON.stringify(base)); process.exit(5); }
  const { b, ctx, p } = await L.phone({ fresh: false }); p.setDefaultTimeout(8000);
  await L.betaInit(ctx);
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await L.setTestCopy(p, url);
  await p.click('.sync-cta'); await p.waitForFunction(() => /pulled \d+ students/i.test(document.body.textContent), null, { timeout: 90000 });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await L.dismissNudge(p);
  const state = () => p.$eval('.as', (e) => e.dataset.state).catch(() => 'none');
  const until = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
  // manual backup of the synced state
  await p.click('.sw-kebab'); await p.click('[data-item=restore]'); await p.click('.bk-now'); await p.waitForTimeout(700);
  await p.click('.bk-scrim >> nth=-1');
  const cell = p.locator('[role=checkbox][aria-checked=true]').first();
  const label = await cell.getAttribute('aria-label'); const sel = `[role=checkbox][aria-label="${label}"]`;
  await p.tap(sel);
  ok((await p.getAttribute(sel, 'aria-checked')) === 'false', 'unticked one cell');
  ok(await until(async () => (await state()) === 'saving', 6000), 'auto-save started after the pause');
  ok(await until(async () => ['saved', 'idle'].includes(await state()), 60000), `auto-save finished (${await state()})`);
  const mid = await pull(); ok(mid.ticked === 215 && mid.rows === 311, `sheet after auto-save ${JSON.stringify(mid)}`);
  // restore the manual snapshot
  await p.click('.sw-kebab'); await p.click('[data-item=restore]');
  await p.click('.bk-row:has(.bk-tag.manual) .bk-go'); await p.waitForSelector('.bk-warn');
  await p.click('.bk-amber'); await p.waitForSelector('.toast');
  ok(/^Restored \d\d:\d\d · 1 tick undone/.test(await p.$eval('.toast-msg', (e) => e.textContent)), 'Restored toast');
  ok(await until(async () => (await p.getAttribute(sel, 'aria-checked')) === 'true', 5000), 'tick back on the phone');
  await p.waitForTimeout(500);
  ok(await until(async () => ['saved', 'idle'].includes(await state()), 60000), 'restore pushed');
  const after = await pull(); ok(after.ticked === 216 && after.rows === 311 && after.sessions === 7, `sheet after restore ${JSON.stringify(after)}`);
  // reopen → pull on open: nothing resurrects / vanishes
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
  ok((await p.getAttribute(sel, 'aria-checked')) === 'true', 'after reload + pull the tick is still back');
  ok(!errs.length, 'no page errors');
  await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(String(e).replace(process.env.SOW_TEST_BRIDGE_TOKEN || '\u0000', '***')); process.exit(2); });
