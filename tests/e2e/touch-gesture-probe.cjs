// Wave A gesture regression (Steve t165u, v0.27.0) — REAL touch via CDP Input.dispatchTouchEvent, Android UA.
// 1) vertical drag on check columns scrolls the list  2) horizontal swipe ticks BOTH dates for the row
// 3) horizontal-then-vertical roll-drag ticks every covered row on release, no leftover rings.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{width:412,height:915}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, userAgent: UA });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */ const cdp = await ctx.newCDPSession(p);
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }] });
  const drag = async (pts, stepMs = 16) => { await touch('touchStart', ...pts[0]); for (const pt of pts.slice(1)) { await touch('touchMove', ...pt); await p.waitForTimeout(stepMs); } await touch('touchEnd'); await p.waitForTimeout(450); };
  const lerp = (a, b, n) => Array.from({ length: n }, (_, i) => [a[0] + (b[0]-a[0])*(i+1)/n, a[1] + (b[1]-a[1])*(i+1)/n]);
  const state = () => p.$$eval('.sw-row', rows => rows.map(r => ({ roll: +r.dataset.roll, on: [...r.querySelectorAll('.sw-check')].map(c => c.classList.contains('on')), glow: r.classList.contains('paint-glow') || r.classList.contains('sel') })));
  const cell = (roll, col) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); return [c.left + c.width/2, c.top + c.height/2]; }, col);
  await p.goto(url+'#checklist/KGA_Eng_CW'); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);

  // 1 vertical scroll on check column
  const s0 = await p.$eval('.sw-list-wrap', e => e.scrollTop);
  const c0 = await cell(6, 1);
  await drag([c0, ...lerp(c0, [c0[0], c0[1]-350], 14)]);
  await p.waitForTimeout(300);
  const s1 = await p.$eval('.sw-list-wrap', e => e.scrollTop);
  ok(s1 - s0 > 150, `vertical drag on ✓ column scrolls list (${s0}→${s1})`);
  const st1 = await state();
  ok(!st1.some(r => r.glow), 'no ring after vertical scroll');

  // 2 horizontal swipe on a row with both off → both on
  let st = await state();
  const vis = async roll => { const y = (await cell(roll,0))[1]; return y > 200 && y < 800; };
  let target = null; for (const r of st) if (!(r.on[0] && r.on[1]) && await vis(r.roll)) { target = r.roll; break; }
  ok(target != null, 'found visible row not fully ticked: ' + target);
  const a = await cell(target, 0), bb = await cell(target, 1);
  await drag([a, ...lerp(a, [bb[0]+10, a[1]+2], 8)]);
  st = await state(); const tr = st.find(r => r.roll === target);
  ok(tr.on[0] && tr.on[1], `horizontal swipe ticks both dates on roll ${target} → ${JSON.stringify(tr.on)}`);
  await p.waitForTimeout(400); st = await state();
  ok(!st.some(r => r.glow), 'no ring left after swipe release');

  // 3 horizontal then vertical across 3 rows
  const rows = st.filter(r => !(r.on[0] && r.on[1]));
  let start = null; for (const r of rows) if (await vis(r.roll) && (await cell(r.roll,0))[1] < 600) { start = r.roll; break; }
  const idx = st.findIndex(r => r.roll === start); const covered = st.slice(idx, idx + 3).map(r => r.roll);
  const s = await cell(start, 0), e = await cell(covered[2], 0);
  await drag([s, ...lerp(s, [s[0]+40, s[1]+2], 5), ...lerp([s[0]+40, s[1]+2], [s[0]+40, e[1]], 10)]);
  st = await state();
  ok(covered.every(r => { const x = st.find(y => y.roll === r); return x.on[0] && x.on[1]; }), `roll-drag ticks covered rows ${covered} → ${JSON.stringify(covered.map(r => st.find(y => y.roll===r).on))}`);
  await p.waitForTimeout(400); st = await state();
  ok(!st.some(r => r.glow), 'no ring left after roll-drag release');

  // 4 pointercancel mid-paint: no ring left
  const c4 = await cell(covered[0], 0);
  await touch('touchStart', ...c4); for (const pt of lerp(c4, [c4[0]+40, c4[1]], 5)) { await touch('touchMove', ...pt); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await p.waitForTimeout(500);
  st = await state(); ok(!st.some(r => r.glow), 'touchcancel leaves no ring');
  // 5 tap toggles exactly one cell
  st = await state(); const tRow = st.find(r => r.roll === covered[0]);
  await drag([await cell(covered[0], 1)]);
  st = await state(); const t2 = st.find(r => r.roll === covered[0]);
  ok(t2.on[1] === !tRow.on[1] && t2.on[0] === tRow.on[0], 'tap toggles only the tapped cell');

  // 6 long-press name (real touch hold) → select mode; roll-drag extends selection; Clear clears
  const nm = await p.$eval(`.sw-row[data-roll="${covered[0]}"] .sw-name`, e => { const r = e.getBoundingClientRect(); return [r.left + 30, r.top + r.height/2]; });
  await touch('touchStart', ...nm); await p.waitForTimeout(950); await touch('touchEnd'); await p.waitForTimeout(300);
  ok(!!(await p.$('.sw-sel-bar')), 'long-press name opens select bar');
  const rl = async r => p.$eval(`.sw-row[data-roll="${r}"] .sw-roll`, e => { const b = e.getBoundingClientRect(); return [b.left + b.width/2, b.top + b.height/2]; });
  const r0 = await rl(covered[0]), r2 = await rl(covered[2]);
  await drag([r0, ...lerp(r0, r2, 8)]);
  const selN = await p.$$eval('.sw-row.sel', e => e.length);
  ok(selN >= 3, 'roll-drag extends selection: ' + selN);
  const btns = await p.$$eval('.sw-sel-bar button', e => e.map(x => x.textContent.trim()));
  console.log('   select bar:', btns.join(' | '));
  const clearI = btns.findIndex(t => /clear/i.test(t));
  if (clearI >= 0) { await p.locator('.sw-sel-bar button').nth(clearI).click(); await p.waitForTimeout(300);
    st = await state(); ok(covered.every(r => { const x = st.find(y => y.roll === r); return !x.on[0] && !x.on[1]; }), 'select → Clear clears covered rows'); }
  const markI = btns.findIndex(t => /mark|tick|set/i.test(t));
  if (markI >= 0) { await p.locator('.sw-sel-bar button').nth(markI).click(); await p.waitForTimeout(300);
    st = await state(); ok(covered.every(r => { const x = st.find(y => y.roll === r); return x.on[0] && x.on[1]; }), 'select → Mark ticks covered rows'); }
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
