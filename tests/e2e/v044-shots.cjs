// v0.44.0 Beta shots: Overview (collapsed only), All dates, swipe EDIT, past amber LOCKED, Back restored, 1-date default,
// Data source card Stable + Beta badge. 412x915 Night+Day, 1440x900 Night. DEMO names injected before every shot.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/'; const out = process.argv[3] || '/workspace/sow-shots/v044';
require('fs').mkdirSync(out, { recursive: true });
const demo = (p) => p.evaluate(() => { document.querySelectorAll('.sw-name').forEach((e, i) => { e.textContent = 'Demo Pupil ' + (i + 1); }); document.querySelectorAll('.toast').forEach((t) => { t.style.visibility = 'hidden'; }); });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h, mob, theme] of [[412, 915, true, 'night'], [412, 915, true, 'day'], [1440, 900, false, 'night']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); indexedDB.deleteDatabase('sow-app-beta'); localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const tag = `${w}x${h}-${theme}`; const shot = async (n) => { await demo(p); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${tag}-${n}.png` }); };
    await shot('1-fresh-device-1-date');
    await p.evaluate(() => localStorage.setItem('sow.dateCols', '2')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.waitForTimeout(400); await shot('2-overview');
    await p.click('.ov-card .top'); await p.waitForSelector('.ad-row');
    for (const [n, t] of [[20, 'Letter Kk'], [23, 'Sight words: the, a'], [26, 'Picture talk — describing a busy market scene']]) {
      await p.click('.ad-add'); await p.waitForSelector('.dem'); await p.focus('.dem .dp-dials [data-dial=date]');
      for (let i = 0; i < n; i++) await p.keyboard.press('ArrowDown');
      await p.fill('.dem-topic', t); await p.click('.dem-ok'); await p.waitForTimeout(300);
    }
    await shot('3-all-dates');
    await p.evaluate(() => { const r = document.querySelectorAll('.ad-row')[1]; r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 10 })); r.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 200, clientY: 10 })); r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 10 })); });
    await p.waitForTimeout(200); await shot('4-all-dates-swipe-edit');
    await p.locator('.ad-row').last().click(); if (await p.$('.ad-row')) await p.locator('.ad-row').last().click(); await p.waitForSelector('[data-testid=past-bar]'); await p.waitForTimeout(400); await shot('5-past-amber');
    await p.click('.past-back'); await p.waitForTimeout(500); await shot('6-back-restored');
    await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.ds-card'); await shot('7-data-source-stable');
    await p.fill('input[name="sow.betaUrl"]', 'https://script.google.com/macros/s/DEMO-TEST-COPY/exec'); await p.locator('input[name="sow.betaUrl"]').blur();
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), p.click('.ds-seg button >> nth=1')]); await p.waitForTimeout(700);
    await shot('8-data-source-beta');
    await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.waitForTimeout(400); await shot('9-overview-beta-badge');
    console.log(tag, 'errors', errs.length, errs.join(' | '));
    await ctx.close();
  }
  await b.close();
})();
