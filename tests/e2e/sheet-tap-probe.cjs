// v0.40.0 (BUGS t85u–t87u): every bottom sheet closes on ONE real tap (backdrop or Close), right after opening via each entry point.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA });
  const cdp = await ctx.newCDPSession(p);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  // real fingers jitter 1–4 px during a tap
  const tapXY = async (x, y) => { await touch('touchStart', x, y); await p.waitForTimeout(20); await touch('touchMove', x + 2, y + 3); await p.waitForTimeout(20); await touch('touchMove', x + 1, y + 4); await p.waitForTimeout(30); await touch('touchEnd'); await p.waitForTimeout(350); };
  const tapSel = async (sel) => { const r = await p.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); await tapXY(r[0], r[1]); };
  const drag = async (x, y, dx, dy, steps = 8) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(350); };
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const openers = {
    Tools: async () => { await tapSel('.sw-kebab'); await tapSel('.sw-menu >> text=Quick overview'); },
    'swipe-up': async () => { const t = await p.$$eval('.tabbar .tab', (e) => { const r = e[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await touch('touchStart', t[0], t[1]); for (let i = 1; i <= 8; i++) { await touch('touchMove', t[0], t[1] - i * 9); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(30); /* tap right away: the old bug */ },
    O: async () => { await p.keyboard.press('KeyO'); await p.waitForTimeout(300); },
  };
  for (const [name, open] of Object.entries(openers)) {
    for (const how of ['backdrop', 'Close']) {
      await open();
      if (!(await p.isVisible('.qo-sheet'))) { ok(false, `${name}: sheet did not open`); continue; }
      if (how === 'backdrop') await tapXY(200, 60); else await tapSel('.qo-close');
      ok(!(await p.isVisible('.qo-sheet')), `Quick overview via ${name}: ONE tap on ${how} closes`);
      if (await p.isVisible('.qo-sheet')) { await tapXY(200, 60); }
    }
  }
  // t88u drag: 1:1 from the first pixel, 30 % / flick closes, otherwise springs back
  const ty = () => p.$eval('.qo-sheet', (e) => new DOMMatrix(getComputedStyle(e).transform).m42).catch(() => null);
  for (const [label, moves, expectClosed] of [['slow 20px drag springs back', [[5, 60], [10, 60], [15, 60], [20, 60]], false], ['drag > 30% closes', [[40, 30], [90, 30], [140, 30], [200, 30]], true], ['flick 40px fast closes', [[20, 8], [40, 8]], true]]) {
    await openers.Tools(); await p.waitForTimeout(100);
    const top = await p.$eval('.qo-sheet', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + 20]; });
    await touch('touchStart', top[0], top[1]);
    let follow = true;
    for (const [dy, wait] of moves) { await touch('touchMove', top[0], top[1] + dy); await p.waitForTimeout(wait); const m = await ty(); if (m == null || Math.abs(m - dy) > 1.5) follow = false; }
    await touch('touchEnd'); await p.waitForTimeout(450);
    ok(follow, `${label}: follows finger 1:1 (first move ${moves[0][0]}px)`);
    ok((await p.isVisible('.qo-sheet')) === !expectClosed, `${label}: ${expectClosed ? 'closed' : 'still open, back at rest'}`);
    if (await p.isVisible('.qo-sheet')) { ok(Math.abs((await ty()) ?? 0) < 1, `${label}: sprang back to 0`); await tapXY(200, 60); }
  }
  // other sheets: Tools, Copy (if present), More pop, Shortcuts, Share
  const others = [
    ['⋮ menu', '#checklist/KGB_Eng_CW', '.sw-kebab', '.sw-menu'],
    ['More', '#checklist/KGB_Eng_CW', '.tabbar .tab:nth-child(3)', '.more-pop'],
  ];
  for (const [name, hash, opener, sheet] of others) {
    await p.goto(url + hash, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    await tapSel(opener); ok(await p.isVisible(sheet), `${name} opens`);
    await tapXY(200, 60); ok(!(await p.isVisible(sheet)), `${name}: ONE backdrop tap closes`);
  }
  await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  await tapSel('text=Keyboard shortcuts'); ok(await p.isVisible('.kb-sheet'), 'Shortcuts opens');
  await tapXY(200, 30); ok(!(await p.isVisible('.kb-sheet')), 'Shortcuts: ONE backdrop tap closes');
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
