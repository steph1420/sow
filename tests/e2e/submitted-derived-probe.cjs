// v0.46.0-beta.3 (Steve t16u) — derived (auto) Submitted is faded to 40%; tapping it unticks it (manual off while Set stays on)
// and shows a warning toast with Undo, which puts the auto tick back. REAL touch via CDP at 412x915. Demo data only.
// Usage: node tests/e2e/submitted-derived-probe.cjs [url]
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await p.waitForTimeout(40); await touch('touchEnd'); await p.waitForTimeout(350); };
  const box = (roll) => `.sw-row[data-roll="${roll}"] .sw-check-hit:nth-of-type(1) .sw-check`;
  const cell = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => { const c = r.querySelectorAll('.sw-check-hit')[0].getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2]; });
  const look = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => { const c = r.querySelectorAll('.sw-check')[0]; return { on: c.classList.contains('on'), derived: c.classList.contains('derived'), op: getComputedStyle(c).opacity }; });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  // pick a visible row with box 1 clear in Set mode
  const roll = await p.$$eval('.sw-row[data-roll]', (rows) => rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top > 150 && b.bottom < 700; }).map((r) => r.dataset.roll)[1]);
  ok(!!roll, `found a visible row (${roll})`);
  let [x, y] = await cell(roll);
  if ((await look(roll)).on) await tap(x, y);
  await tap(x, y); ok((await look(roll)).on, 'Set mode: tap ticks Set');
  // switch to Submitted mode with the M shortcut on a focused cell
  await p.focus(`.sw-row[data-roll="${roll}"] .sw-check-hit`); await p.keyboard.press('m'); await p.waitForTimeout(300);
  ok(await p.$eval('.sw-page', (e) => e.className.includes('mode-sub')), 'M switches to Submitted mode');
  // demo data may hold a manual Submitted here: manual → tap → derived
  [x, y] = await cell(roll);
  for (let i = 0; i < 3 && !(await look(roll)).derived; i++) await tap(x, y);
  await p.waitForTimeout(4500) // let any earlier toast go
  let s = await look(roll);
  ok(s.on && s.derived && Math.abs(+s.op - 0.4) < 0.01, `derived Submitted shown on and faded to 40% (${JSON.stringify(s)})`);
  await tap(x, y);
  s = await look(roll); ok(!s.on, 'tap on derived Submitted unticks it');
  const toastTxt = await p.evaluate(() => document.body.innerText.includes('Auto Submitted unticked'));
  ok(toastTxt, 'warning toast shown');
  const undo = await p.$('button:has-text("Undo")'); ok(!!undo, 'toast has Undo');
  if (undo) { const bb = await undo.boundingBox(); await tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
  s = await look(roll); ok(s.on && s.derived, `Undo restores the auto (derived, faded) tick (${JSON.stringify(s)})`);
  // manual path: off → tap = manual on (solid), no toast for a manual untick
  await tap(x, y); await tap(x, y);
  s = await look(roll); ok(s.on && !s.derived && +s.op === 1, `tap on an unticked box makes it manual + solid (${JSON.stringify(s)})`);
  // persistence: reload keeps manual
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  await p.focus(`.sw-row[data-roll="${roll}"] .sw-check-hit`); await p.keyboard.press('m'); await p.waitForTimeout(300);
  s = await look(roll); ok(s.on && !s.derived, 'manual Submitted survives reload');
  // Set mode tap does not toast
  console.log('RESULT ' + fails + ' fails');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(2); });
