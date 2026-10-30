// v0.40.1 (t95u): desktop viewports must scale the phone UI (fails if --wide-scale stays 1).
const { phone } = require('./_launch.cjs');
const url = process.argv[2]; const tag = process.argv[3] || 'live';
let fails = 0;
(async () => {
  for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080], [2560, 1440]]) {
    const { b, p } = await phone({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const r = document.querySelector('#root').getBoundingClientRect(); const row = document.querySelector('.sw-row')?.getBoundingClientRect(); return { scale: getComputedStyle(document.documentElement).getPropertyValue('--wide-scale'), wide: document.documentElement.classList.contains('wide'), rootW: Math.round(r.width), rowW: row && Math.round(row.width), rowH: row && Math.round(row.height), font: getComputedStyle(document.querySelector('.sw-name')).fontSize, bundle: [...document.scripts].map((s) => s.src).find((s) => /index-/.test(s)) }; });
    const ok = m.wide && +m.scale > 1; if (!ok) fails++;
    console.log((ok ? 'PASS ' : 'FAIL ') + w + 'x' + h, JSON.stringify(m));
    await p.screenshot({ path: '/workspace/shots-v040/wide-' + tag + '-' + w + 'x' + h + '.png' });
    await b.close();
  }
  console.log('RESULT', fails, 'fails'); process.exit(fails ? 1 : 0);
})();
