// v0.43.0 Beta shots: popover, swipe, add one/two, edit, delete warning — 412x915 Night+Day, 1440x900 Night. DEMO names injected.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/'; const out = process.argv[3] || '/workspace/sow-shots/v043';
require('fs').mkdirSync(out, { recursive: true });
const demo = (p) => p.evaluate(() => document.querySelectorAll('.sw-name').forEach((e, i) => { e.textContent = 'Demo Pupil ' + (i + 1); }));
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h, mob, theme] of [[412, 915, true, 'night'], [412, 915, true, 'day'], [1440, 900, false, 'night']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */ const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const tag = `${w}x${h}-${theme}`; const shot = async (n) => { await demo(p); await p.waitForTimeout(120); await p.screenshot({ path: `${out}/${tag}-${n}.png` }); };
    await p.locator('.sw-dh-btn').last().click(); await p.waitForSelector('.dpo'); await shot('1-popover');
    await p.$eval('.dpo-row >> nth=0', (e) => e.classList.add('swiped')).catch(async () => { await p.evaluate(() => document.querySelector('.dpo-row').classList.add('swiped')); });
    await shot('2-swiped');
    await p.click('.dpo-add'); await p.waitForSelector('.dem'); await shot('3-add-one');
    await p.click('.dem-plus'); await p.fill('.dem-topic', 'Rhymes: -at family'); await shot('4-add-two');
    await p.mouse.click(5, h - 5); await p.waitForTimeout(200);
    await p.locator('.sw-dh-btn').last().click(); await p.$eval('.dpo-row.cur .dpo-edit', (e) => e.click()); await p.waitForSelector('.dem-big'); await shot('5-edit');
    await p.click('.dem-del'); await shot('6-delete-warn');
    console.log(tag, 'errors', errs.length);
    await ctx.close();
  }
  await b.close();
})();
