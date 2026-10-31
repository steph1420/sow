// v0.42.0 verification shots: Dates sheet (Q-DATES-A) — 412x915 Night + Day, 1440x900 Night. Demo data only.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/'; const out = process.argv[3] || '/workspace/shots-v042';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h, mob, theme] of [[412, 915, true, 'night'], [412, 915, true, 'day'], [1440, 900, false, 'night']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */ const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const tag = `${w}x${h}-${theme}`;
    await p.locator('.sw-lean-dates').first().click(); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${tag}-1-dates-sheet.png` });
    await p.$eval('.dp-dials [data-dial=month]', (e) => e.focus()); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/${tag}-2-reorder-note.png` });
    if (theme === 'day' || w > 500) { await ctx.close(); console.log(tag, 'errors', errs.length); continue; }
    await p.$eval('.dp-sheet', (e) => { e.scrollTop = e.scrollHeight; }); await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/${tag}-3-bottom.png` });
    console.log(tag, 'errors', errs.length, 'names', await p.$$eval('.sw-name', (e) => e.slice(0, 4).map((x) => x.textContent).join('|')));
    await ctx.close();
  }
  await b.close();
})();
