// v0.42.0 verification shots — v0.44.5: updated for the v0.43+ date popover (the old Dates sheet .dp-sheet is retired).
// 412x915 Night + Day, 1440x900 Night. Demo data only; DEMO names injected before every shot.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/'; const out = process.argv[3] || '/workspace/shots-v042';
require('fs').mkdirSync(out, { recursive: true });
const demo = (p) => p.evaluate(() => { document.querySelectorAll('.sw-name').forEach((e, i) => { e.textContent = 'Demo Pupil ' + (i + 1); }); document.querySelectorAll('.toast').forEach((t) => { t.style.visibility = 'hidden'; }); });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h, mob, theme] of [[412, 915, true, 'night'], [412, 915, true, 'day'], [1440, 900, false, 'night']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const tag = `${w}x${h}-${theme}`; const shot = async (n) => { await demo(p); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${tag}-${n}.png` }); };
    await p.locator('.sw-lean-dates').first().click(); await p.waitForSelector('.dpo-row'); await p.waitForTimeout(300);
    await shot('1-dates-popover');
    await p.$eval('.dpo-row:last-child .dpo-edit', (e) => e.click()); await p.waitForSelector('.dem'); await p.waitForTimeout(300);
    await p.$eval('.dem .dp-dials [data-dial=month]', (e) => e.focus()); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200);
    await shot('2-edit-popup-dials');
    console.log(tag, 'errors', errs.length);
    await ctx.close();
  }
  await b.close();
})();
