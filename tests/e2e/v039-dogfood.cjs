// v0.39.0 dogfood (t81u): real touch 412×915 + keyboard 1920×1080.
const { phone, chromium, launchOpts } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const log = [];
(async () => {
  { // touch
    const { b, ctx, p } = await phone();
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
    const drag = async (x, y, dx, dy, steps = 8, ms = 16) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(ms); } await touch('touchEnd'); await p.waitForTimeout(300); };
    const open = () => p.isVisible('.qo-sheet');
    const ring = () => p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return false; const cs = getComputedStyle(a); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2; });
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const tab = await p.$$eval('.tabbar .tab', (e) => { const r = e[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.top]; });
    let acc = 0, t0 = Date.now();
    for (let i = 0; i < 20; i++) { await p.tap('.tabbar .tab >> nth=1'); if (await open()) { acc++; await p.keyboard.press('Escape'); } }
    log.push({ mode: 'touch', task: '20 taps on Checklist tab', accidental: acc, ms: Date.now() - t0 });
    acc = 0;
    for (let i = 0; i < 10; i++) { await drag(200, 600, 0, -400, 6, 8); await drag(200, 300, 0, 400, 6, 8); if (await open()) { acc++; await p.keyboard.press('Escape'); } }
    log.push({ mode: 'touch', task: '20 list flings (up/down)', accidental: acc });
    acc = 0;
    for (let i = 0; i < 10; i++) { await drag(tab[0], tab[2] - 120, 0, 140); if (await open()) { acc++; await p.keyboard.press('Escape'); } }
    log.push({ mode: 'touch', task: '10 drags from list down into tab bar', accidental: acc });
    acc = 0;
    for (let i = 0; i < 10; i++) { await drag(tab[0] - 60 + i * 12, 912, 0, -90); if (await open()) { acc++; await p.keyboard.press('Escape'); } }
    log.push({ mode: 'touch', task: '10 OS home-edge swipes (bottom 3px)', accidental: acc });
    acc = 0;
    for (let i = 0; i < 10; i++) { await drag(tab[0] - 40, tab[1], 90, -25); if (await open()) { acc++; await p.keyboard.press('Escape'); } }
    log.push({ mode: 'touch', task: '10 sideways drags across tab bar', accidental: acc });
    let hit = 0; t0 = Date.now();
    for (let i = 0; i < 10; i++) { await drag(tab[0], tab[1], 0, -60); if (await open()) { hit++; const r = await p.$eval('.qo-sheet', (e) => { const x = e.getBoundingClientRect(); return [x.left + x.width / 2, x.top + 15]; }); await drag(r[0], r[1], 0, 150); } }
    log.push({ mode: 'touch', task: '10 intended swipe-ups (60px) + swipe-down close', opened: hit, closedAll: !(await open()), ms: Date.now() - t0 });
    const heads = await p.$$eval('.sw-colbtn, .date-pill, .sw-tools-chip, .sw-search-btn, .sw-icon-btn, .tabbar .tab', (els) => els.filter((x) => x.getClientRects().length).map((e) => {
      const hit = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); };
      const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let l = 0, rr = 0, u = 0, d = 0;
      while (l < 40 && hit(cx - l - 1, cy)) l++; while (rr < 40 && hit(cx + rr + 1, cy)) rr++; while (u < 40 && hit(cx, cy - u - 1)) u++; while (d < 40 && hit(cx, cy + d + 1)) d++;
      return { c: e.className.split(' ').slice(0, 2).join('.'), w: l + rr + 1, h: u + d + 1 };
    }));
    log.push({ mode: 'touch', task: 'header/tab tap targets', hitAreas: heads.map((h) => `${h.c} ${h.w}×${h.h}`), under44: heads.filter((h) => h.w < 44 || h.h < 44) });
    await p.tap('.sw-colbtn >> nth=0'); log.push({ mode: 'touch', task: 'ring after header tap', ring: await ring() });
    await p.tap('[aria-label="Undo"]');
    await p.tap('.sw-tools-chip'); await p.tap('text=Quick overview'); log.push({ mode: 'touch', task: 'Tools › Quick overview', opened: await open(), ring: await ring() });
    await b.close();
  }
  { // keyboard
    const b = await chromium.launch(launchOpts); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    let keys = 0; const press = async (k) => { await p.keyboard.press(k); keys++; await p.waitForTimeout(80); };
    let t0 = Date.now(); for (let i = 0; i < 15; i++) { await press('Tab'); if (await p.evaluate(() => document.activeElement?.hasAttribute('data-cell'))) break; }
    await press('KeyO'); const o = await p.isVisible('.qo-sheet'); await press('Escape');
    log.push({ mode: 'kbd', task: 'grid → O → Esc', keys, opened: o, focusBack: await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), ms: Date.now() - t0 });
    keys = 0; t0 = Date.now();
    // header via Tab: Shift+Tab from grid reaches the column header?
    let reached = false; for (let i = 0; i < 6 && !reached; i++) { await press('Shift+Tab'); reached = await p.evaluate(() => document.activeElement?.classList.contains('sw-colbtn')); }
    const lab = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    log.push({ mode: 'kbd', task: 'reach date header (Shift+Tab)', keys, reached, label: lab, ring: await p.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2) });
    await p.focus('[data-cell="0-0"]'); await press('Digit1'); await press('Digit2');
    const hdr = await p.$$eval('.sw-colbtn .c', (e) => e.map((x) => x.textContent));
    log.push({ mode: 'kbd', task: '1 then 2 updates both header counts live', counts: hdr });
    await b.close();
  }
  for (const l of log) console.log(JSON.stringify(l));
})().catch((e) => { console.error(e); process.exit(2); });
