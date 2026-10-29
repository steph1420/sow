// v0.39.0 (t74u/t76u–t81u): header cleanup, card date label, date headers with counts, quick overview sheet (Tools · swipe-up · O).
const { phone, chromium, launchOpts } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const drag = async (x, y, dx, dy, steps = 8) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(350); };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  // Overview header
  ok(!(await p.isVisible('.ov-eyebrow')), 'Overview: HOME eyebrow gone');
  ok(!(await p.isVisible('.ov-sub')), 'Overview: subtitle gone');
  ok(await p.isVisible('.ov-title'), 'Overview title kept');
  const lines = await p.$$eval('.ov-card .line', (e) => e.map((x) => x.textContent.trim()));
  ok(lines.some((l) => /^Upcoming: Mon 2/.test(l)), `future session card says "Upcoming:" (${lines.find((l) => /Mon 2/.test(l))})`);
  ok(lines.some((l) => /^Latest: Wed 28/.test(l)) && !lines.some((l) => /^Upcoming: Wed 28/.test(l)), `past session card is not "Upcoming" (${lines.find((l) => /Wed 28/.test(l))})`);
  // Checklist header
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(!(await p.isVisible('.sw-lean-count')), '"16/44 SET" removed');
  const heads = await p.$$eval('.sw-colhead .sw-allbox', (e) => e.map((x) => ({ t: x.textContent.trim(), h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width, l: x.getAttribute('aria-label') })));
  ok(heads.length === 2, `two date headers (${heads.map((h) => h.t).join(' | ')})`);
  ok(heads.every((h) => /\d+\/\d+.*\d+\/\d+/.test(h.t)), 'each header shows date + count');
  ok(heads.every((h) => h.h >= 44 && h.w >= 44), `header targets ≥44px (${heads.map((h) => `${Math.round(h.w)}×${Math.round(h.h)}`)})`);
  ok(heads.every((h) => /tick all|untick all/i.test(h.l)), 'header keeps column tick/untick-all action');
  const headDates = await p.$$eval('.sw-colbtn .d', (e) => e.map((x) => x.textContent.trim()));
  ok(headDates[0] === '28/10' && headDates[1] === '2/11', `calendar order (t82u) (${headDates})`);
  const n0 = await p.$$eval('[data-cell$="-0"][aria-checked="true"]', (e) => e.length);
  ok(heads[0].t.includes(`${n0}/`), `column 1 count matches ticks (${n0})`);
  await p.tap('.sw-colhead .sw-allbox >> nth=0'); await p.waitForTimeout(200);
  const n0b = await p.$$eval('[data-cell$="-0"][aria-checked="true"]', (e) => e.length);
  ok(n0b !== n0, 'tapping header still ticks/unticks the column');
  if (await p.isEnabled('[aria-label="Undo"]')) await p.tap('[aria-label="Undo"]');
  await p.tap('.date-pill >> nth=0'); await p.waitForTimeout(200);
  ok((await p.$$eval('.sw-colhead .sw-allbox', (e) => e.length)) === 1, '1-date view: one header');
  await p.tap('.date-pill >> nth=0'); await p.waitForTimeout(200);
  // Quick overview: Tools
  await p.tap('.sw-tools-chip'); await p.waitForTimeout(150);
  await p.tap('text=Quick overview'); await p.waitForTimeout(250);
  ok(await p.isVisible('[role=dialog][aria-label="Quick overview"]'), 'Tools › Quick overview opens sheet');
  const rows = await p.$$eval('.qo-date', (e) => e.map((x) => x.textContent));
  ok(rows.length === 2 && rows.every((r) => /\d+\/\d+/.test(r) && /pending/i.test(r)), `sheet per date: label, count, pending (${rows.length})`);
  ok(await p.isVisible('.qo-bar'), 'sheet has bars');
  const sh = await p.$eval('.qo-sheet', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 20]; });
  await drag(sh[0], sh[1], 0, 160); ok(!(await p.isVisible('.qo-sheet')), 'swipe down closes sheet');
  // Swipe up on Checklist tab
  const tab = await p.$eval('.tabbar .tab >> nth=1', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }).catch(async () => p.$$eval('.tabbar .tab', (e) => { const r = e[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  ok(await p.isVisible('.tab .qo-grabber'), 'grabber hint on Checklist tab');
  await drag(tab[0], tab[1], 0, -70); ok(await p.isVisible('.qo-sheet'), 'swipe up on Checklist tab opens sheet');
  await p.tap('.qo-scrim', { position: { x: 200, y: 30 } }); await p.waitForTimeout(250);
  // accidental triggers
  await drag(tab[0], tab[1], 0, -15); ok(!(await p.isVisible('.qo-sheet')), 'short drag (15px) does not open');
  await drag(tab[0], tab[1], 80, -50); ok(!(await p.isVisible('.qo-sheet')), 'diagonal drag does not open');
  await p.tap('.tabbar .tab >> nth=1'); await p.waitForTimeout(250); ok(!(await p.isVisible('.qo-sheet')) && (await p.evaluate(() => location.hash)).startsWith('#checklist'), 'tap stays a tap');
  await drag(tab[0], 913, 0, -80); ok(!(await p.isVisible('.qo-sheet')), 'OS home-edge swipe (starts at bottom edge) ignored');
  // key O
  await p.focus('[data-cell="0-0"]').catch(() => {});
  await p.keyboard.press('KeyO'); await p.waitForTimeout(250); ok(await p.isVisible('.qo-sheet'), 'O opens sheet');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok(!(await p.isVisible('.qo-sheet')) && await p.evaluate(() => document.activeElement?.getAttribute('data-cell') === '0-0'), 'Esc closes, focus returns');
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  await p.click('.sw-search-btn'); await p.keyboard.type('o'); await p.waitForTimeout(200);
  ok(!(await p.isVisible('.qo-sheet')), 'O while typing does nothing');
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
