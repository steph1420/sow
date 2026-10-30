// v0.30.0 (t175u) — REAL touch (CDP): every swipe-confirm style × Set/Submitted, held + quick swipes.
// Held: the style's own cue (and only it) shows on the covered row, in the mode colour where relevant.
// Quick (~60 ms): no glow/ring frame for non-blue styles ("no strobe"), cue gone on release, ticks land.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const STYLES = ['blue', 'tint', 'ghost', 'sliver', 'wash', 'ghostTint'];
const MODE_RGB = { set: 'rgb(48, 209, 88)', submitted: 'rgb(139, 124, 247)' };
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const fresh = async (prefs) => {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((pr) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify(pr)); }, prefs);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  };
  const setMode = async (mode) => { if (mode === 'set') return; await p.click('.sw-kebab'); await p.click('.sw-menu [data-mode=submitted]'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); };
  // first visible row that has an unticked box (so the swipe ticks → ghost ✓ previews)
  const pickRow = () => p.$$eval('.sw-row', (rows) => { const r = rows.find((x) => x.getBoundingClientRect().top > 220 && x.getBoundingClientRect().bottom < 700 && x.querySelector('.sw-check:not(.on)')); return +r.dataset.roll; });
  const cell = (roll, col) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r, col) => { const c = r.querySelectorAll('.sw-check-hit')[col].getBoundingClientRect(); const rr = r.getBoundingClientRect(); return [c.left + c.width / 2, c.top + c.height / 2, rr.height]; }, col);
  const probeRow = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => {
    const cs = getComputedStyle(r), before = getComputedStyle(r, '::before');
    const nb = r.parentElement.querySelector(`.sw-row:not([data-roll="${r.dataset.roll}"]):not(.pc):not(.paint-glow)`);
    const ghosts = [...r.querySelectorAll('.sw-check:not(.on)')].map((c) => { const a = getComputedStyle(c, '::after'); return a.content !== 'none' && parseFloat(a.opacity) > 0 ? a.backgroundColor : null; }).filter(Boolean);
    return { cls: r.className, shadow: cs.boxShadow, bg: cs.backgroundColor, nbBg: nb ? getComputedStyle(nb).backgroundColor : '', bgImg: cs.backgroundImage, wash: r.style.getPropertyValue('--wash-x'),
      sliverW: before.content !== 'none' ? before.width : '', sliverBg: before.backgroundColor, ghosts, pendingBoxes: r.querySelectorAll('.sw-check.pending').length, trans: cs.transitionDuration };
  });

  for (const mode of ['set', 'submitted']) {
    for (const style of STYLES) {
      await fresh({ 'gestures.swipeConfirmStyle': style });
      await setMode(mode);
      const tag = `${style}/${mode}`;
      const roll = await pickRow();
      let [x, y, rh] = await cell(roll, 0); const [x2] = await cell(roll, 1);
      // HELD swipe on one row
      await touch('touchStart', x, y);
      for (const px of [x + 14, x + 30, (x + x2) / 2]) { await touch('touchMove', px, y + 1); await p.waitForTimeout(20); }
      const h1 = await probeRow(roll);
      await touch('touchMove', x2 + 6, y + 1); await p.waitForTimeout(30);
      const h2 = await probeRow(roll);
      const glowy = /\d+px \d+px 1[0-9]px|18px/.test(h1.shadow);
      if (style === 'blue') ok(/inset/.test(h1.shadow) && h1.pendingBoxes > 0, `${tag}: blue ring + blue boxes (${h1.shadow.slice(0, 40)})`);
      else ok(!/inset/.test(h1.shadow) && !glowy && h1.pendingBoxes === 0 && !/paint-glow/.test(h1.cls), `${tag}: no ring/glow`);
      if (style === 'tint') ok(h1.bg !== h1.nbBg && h1.ghosts.length === 0 && !h1.sliverW, `${tag}: soft tint only (${h1.bg} vs ${h1.nbBg})`);
      if (style === 'ghost' || style === 'ghostTint') ok(h1.ghosts.length > 0 && h1.ghosts.every((c) => c === MODE_RGB[mode]) && h1.bg === h1.nbBg, `${tag}: ghost ✓ in mode colour, row untouched (${h1.ghosts})`);
      if (style === 'sliver') ok(h1.sliverW === '3px' && h1.sliverBg === MODE_RGB[mode] && h1.bg === h1.nbBg, `${tag}: 3px left sliver in mode colour (${h1.sliverW} ${h1.sliverBg})`);
      if (style === 'wash') ok(/gradient/.test(h1.bgImg) && h1.wash && h2.wash && parseFloat(h2.wash) > parseFloat(h1.wash), `${tag}: wash follows finger ${h1.wash}→${h2.wash}`);
      if (style !== 'blue') ok(h1.trans.split(',').every((t) => t.trim() === '0s'), `${tag}: no transition on the cue (${h1.trans})`);
      // B+A: extend to a second row → tint joins
      if (style === 'ghostTint') {
        for (const [px, py] of [[x2, y + rh * 0.9], [x2 + 8, y + rh * 1.35]]) { await touch('touchMove', px, py); await p.waitForTimeout(25); }
        const h3 = await probeRow(roll);
        ok(/pc-tint/.test(h3.cls) && h3.bg !== h1.bg, `${tag}: ≥2 rows add the ~7% tint (${h3.bg})`);
      }
      await touch('touchEnd'); await p.waitForTimeout(120);
      const after = await p.evaluate(() => document.querySelectorAll('.sw-row.pc, .sw-row.paint-glow, .sw-check.pending').length);
      const ticked = await p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => [...r.querySelectorAll('.sw-check')].every((c) => c.classList.contains('on')));
      ok(after === 0 && ticked, `${tag}: held swipe commits both dates, cue cleared`);

      // QUICK swipe (~60 ms) on another row: sample every frame for a glow/ring frame
      await p.evaluate(() => { window.__frames = []; const tick = () => { for (const r of document.querySelectorAll('.sw-row')) { const s = getComputedStyle(r).boxShadow; if (s !== 'none') window.__frames.push(s) } if (window.__sampling) requestAnimationFrame(tick) }; window.__sampling = true; requestAnimationFrame(tick) });
      const roll2 = await p.$$eval('.sw-row', (rows, r0) => { const r = rows.find((x) => +x.dataset.roll !== r0 && x.getBoundingClientRect().top > 220 && x.getBoundingClientRect().bottom < 760 && x.querySelector('.sw-check:not(.on)')); return +r.dataset.roll; }, roll);
      [x, y] = await cell(roll2, 0);
      await touch('touchStart', x, y); await touch('touchMove', x + 20, y); await touch('touchMove', x + 60, y + 1); await p.waitForTimeout(16); await touch('touchEnd');
      await p.waitForTimeout(80);
      const frames = await p.evaluate(() => { window.__sampling = false; return window.__frames; });
      const quickAfter = await p.evaluate(() => document.querySelectorAll('.sw-row.pc, .sw-row.paint-glow, .sw-check.pending').length);
      const q = await p.$eval(`.sw-row[data-roll="${roll2}"]`, (r) => [...r.querySelectorAll('.sw-check')].every((c) => c.classList.contains('on')));
      if (style !== 'blue') ok(!frames.some((s) => /inset|18px/.test(s)), `${tag}: quick swipe — no ring/glow frame (${frames.length} shadow frames)`);
      ok(quickAfter === 0 && q, `${tag}: quick swipe ticks, cue gone on release`);
    }
  }
  console.log(`RESULT ${fails} fails`);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
