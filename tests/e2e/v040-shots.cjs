// v0.40.0 before/after shots: Night/Day at 412x915 and 1920x1080 (demo data only).
const { phone } = require('./_launch.cjs');
const url = process.argv[2]; const tag = process.argv[3]; const out = '/workspace/shots-v040';
(async () => {
  for (const [vw, vh, mob] of [[412, 915, true], [1920, 1080, false]]) for (const theme of ['night', 'day']) {
    const { b, p } = await phone({ viewport: { width: vw, height: vh }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
    const set = () => p.evaluate((t) => { if (t === 'day') document.documentElement.setAttribute('data-theme', 'day'); else document.documentElement.removeAttribute('data-theme'); }, theme);
    const n = out + '/' + tag + '-' + theme + '-' + vw;
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); await set(); await p.waitForTimeout(200);
    await p.screenshot({ path: n + '-overview.png' });
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(600); await set(); await p.waitForTimeout(200);
    await p.screenshot({ path: n + '-checklist.png' });
    await p.evaluate(() => { const l = document.querySelector('.sw-list-wrap'); if (l) l.scrollTop = l.scrollHeight; }); await p.waitForTimeout(300);
    await p.screenshot({ path: n + '-checklist-bottom.png' });
    if (tag === 'after') { await p.$eval('.sw-lean-dates', (e) => e.click()); await p.waitForTimeout(400); await p.screenshot({ path: n + '-dates-panel.png' }); }
    await b.close();
  }
})();
