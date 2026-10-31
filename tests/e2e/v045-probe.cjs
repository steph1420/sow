// v0.45.0 — REAL touch (CDP) 412x915, demo data, no bridge: auto-save icon left of Undo (hidden at rest →
// saving → saved → hidden), offline queue count, snapshots (app opened / after N changes / Back up now),
// ⋮ › Restore snapshot… amber confirm with then/now counts → Restored toast → Undo brings the tick back.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone({ fresh: false });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(6000);
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await touch('touchEnd'); await p.waitForTimeout(250); };
  const tapEl = async (loc) => { const r = await loc.boundingBox(); await tap(r.x + r.width / 2, r.y + r.height / 2); };
  const state = () => p.$eval('.as', (e) => e.dataset.state).catch(() => 'none');
  const seen = async (want, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if ((await state()) === want) return true; await p.waitForTimeout(60); } return false; };
  await p.goto(url + '#checklist/KGA_Eng_CW', { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  ok((await state()) === 'idle', 'icon hidden at rest');
  const pos = await p.evaluate(() => { const a = document.querySelector('.as').getBoundingClientRect(); const u = document.querySelector('[aria-label=Undo]').getBoundingClientRect(); return a.right <= u.left + 1; });
  ok(pos, 'icon sits left of Undo');
  const cell = p.locator('[role=checkbox]').first();
  const was = await cell.getAttribute('aria-checked');
  await tapEl(cell);
  ok((await cell.getAttribute('aria-checked')) !== was, 'touch tap toggles a tick');
  ok(!(await seen('saving', 1500)), 'no save before the 2 s pause');
  ok(await seen('saving', 3000), 'saving ring after the pause');
  ok(await seen('saved', 2500), 'ring becomes a tick');
  ok(await seen('idle', 3000), 'tick fades back to hidden');
  // snapshots
  await tapEl(p.locator('.sw-kebab')); await tapEl(p.locator('[data-item=restore]'));
  await p.waitForSelector('.bk-row[data-snap]');
  const reasons = await p.$$eval('.bk-row .bk-body > .bk-meta:nth-child(2)', (els) => els.map((e) => e.textContent));
  ok(reasons.some((r) => /app opened/.test(r)) && reasons.some((r) => /after 1 change/.test(r)), `snapshots: ${reasons.join(' | ')}`);
  await tapEl(p.locator('.bk-now')); await p.waitForTimeout(500);
  ok((await p.$$('.bk-row[data-snap]')).length === reasons.length + 1, 'Back up now adds a Manual snapshot');
  // restore the "app opened" one
  const rows = p.locator('.bk-row[data-snap]'); const n = await rows.count();
  await tapEl(rows.nth(n - 1).locator('.bk-go'));
  await p.waitForSelector('.bk-warn');
  const then = await p.$eval('.bk-stat:nth-child(1) b', (e) => e.textContent); const now = await p.$eval('.bk-stat:nth-child(2) b', (e) => e.textContent);
  ok(then !== now, `confirm shows ticks then ${then} / now ${now}`);
  ok(/and on the sheet/.test(await p.$eval('.bk-warn', (e) => e.textContent)), 'amber warning names the sheet');
  await tapEl(p.locator('.bk-amber')); await p.waitForSelector('.toast');
  const t = await p.$eval('.toast-msg', (e) => e.textContent);
  ok(/^Restored \d\d:\d\d · 1 tick undone$/.test(t), `toast: ${t}`);
  await p.waitForTimeout(400);
  ok((await cell.getAttribute('aria-checked')) === was, 'tick undone on the checklist');
  await tapEl(p.locator('.toast-act'));
  await p.waitForTimeout(900);
  console.log('after undo toast:', await p.$eval('.toast-msg', (e) => e.textContent).catch(() => 'none'));
  ok((await cell.getAttribute('aria-checked')) !== was, 'Undo restores Before restore');
  await tapEl(p.locator('.sw-kebab')); await tapEl(p.locator('[data-item=restore]')); await p.waitForSelector('.bk-row[data-snap]');
  ok((await p.$$eval('.bk-tag.before', (e) => e.length)) >= 1, 'Before restore snapshot listed');
  await p.keyboard.press('Escape').catch(() => {}); if (await p.$('.bk-scrim')) await tapEl(p.locator('.bk-scrim').last()); await p.waitForTimeout(4500);
  // offline queue
  await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')));
  const c1 = p.locator('[role=checkbox]').nth(1), c2 = p.locator('[role=checkbox]').nth(2);
  const b1 = [await c1.getAttribute('aria-checked'), await c2.getAttribute('aria-checked')];
  await tapEl(c1); await p.waitForTimeout(400); await tapEl(c2);
  
  await p.waitForTimeout(800);
  ok(await seen('queued', 2500), 'offline → dim cloud');
  const cnt = await p.$eval('.as .cnt', (e) => e.textContent).catch(() => '');
  ok(cnt === '2', `offline count = ${cnt}`);
  await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')));
  const tl = []; for (let i = 0; i < 40; i++) { tl.push(await state()); await p.waitForTimeout(100); }
  ok(tl.includes('saved') || tl.at(-1) === 'idle', `back online saves by itself (${[...new Set(tl)].join('→')})`);
  ok(!errs.length, `no page errors ${errs.join(';')}`);
  await b.close(); console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
