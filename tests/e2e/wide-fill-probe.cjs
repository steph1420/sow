// v0.40.2 (t95u/t96u): on realistic desktop inner sizes every route + sheet must be scaled AND fill the width.
const { phone } = require('./_launch.cjs');
const url = process.argv[2]; const tag = process.argv[3] || 'local';
const sizes = [[1440, 780], [1280, 680], [1512, 860], [1728, 980], [1024, 540], [1920, 960], [2560, 1300]];
const routes = [['overview', ''], ['checklist', '#checklist/KGB_Eng_CW'], ['settings', '#settings'], ['sync', '#settings/sync'], ['more', '#more']];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  for (const [w, h] of sizes) {
    const { b, p } = await phone({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    for (const [name, hash] of routes) {
      await p.goto(url + hash, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      const m = await p.evaluate(() => { const sh = document.querySelector('.app-shell') || document.querySelector('#root > *'); const r = sh.getBoundingClientRect(); return { s: +getComputedStyle(document.documentElement).getPropertyValue('--wide-scale') || 1, fill: r.width / innerWidth, left: r.left }; });
      const big = h >= 640;
      ok((big ? m.s > 1.05 : true) && m.fill >= 0.97, `${w}x${h} ${name}: scale ×${m.s} · fills ${Math.round(m.fill * 100)}% of width`);
      await p.screenshot({ path: `/workspace/shots-v040/v0402-${tag}-${w}x${h}-${name}.png` });
    }
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    await p.keyboard.press('Tab'); await p.focus('[data-cell="0-0"]').catch(() => {}); await p.keyboard.press('KeyO'); await p.waitForTimeout(300);
    const qs = await p.$eval('.qo-sheet', (e) => e.getBoundingClientRect().width / innerWidth).catch(() => 0);
    ok(qs >= 0.4, `${w}x${h} Quick overview sheet width ${Math.round(qs * 100)}% of window`);
    await p.screenshot({ path: `/workspace/shots-v040/v0402-${tag}-${w}x${h}-sheet.png` });
    await b.close();
  }
  console.log('RESULT', fails, 'fails'); process.exit(fails ? 1 : 0);
})();
