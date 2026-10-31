// v0.44.5 shots: date popover option A (bar + green date + ✓), past view tinted header strip, masked Connections. 412x915 Night+Day. DEMO names.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/'; const out = process.argv[3] || '/workspace/sow-shots/v0445';
require('fs').mkdirSync(out, { recursive: true });
const demo = (p) => p.evaluate(() => { document.querySelectorAll('.sw-name').forEach((e, i) => { e.textContent = 'Demo Pupil ' + (i + 1); }); document.querySelectorAll('.toast').forEach((t) => { t.style.visibility = 'hidden'; }); });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const theme of ['night', 'day']) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const nn = p.getByRole('button', { name: 'Not now', exact: true }); if (await nn.count()) await nn.first().click();
    await p.click('.ov-card .top'); await p.waitForSelector('.ad-row');
    await p.click('.ad-add'); await p.waitForSelector('.dem'); await p.$eval('.dem .dp-dials [data-dial=month]', (e) => e.focus()); await p.keyboard.press('ArrowDown');
    await p.fill('.dem-topic', 'Letter Kk'); await p.click('.dem-ok'); await p.waitForTimeout(300);
    await p.goto(url + '#checklist/KGA_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const tag = `412x915-${theme}`; const shot = async (n) => { await demo(p); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${tag}-${n}.png` }); };
    await p.locator('.sw-dh-btn').first().click(); await p.waitForSelector('.dpo-row'); await p.waitForTimeout(300);
    await shot('1-popover-option-A');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.goto(url + '#overview', { waitUntil: 'networkidle' }); await p.waitForTimeout(400); await p.click('.ov-card .top'); await p.waitForSelector('.ad-row');
    await p.locator('.ad-row').last().click(); await p.waitForSelector('[data-testid=past-bar]').catch(() => {}); await p.waitForTimeout(400);
    await shot('2-past-tinted-header');
    await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    await p.fill('input[name=sow-sync-url]', 'https://script.google.com/macros/s/AKfycbDEMOdemoDEMOdemo0000/exec'); await p.locator('input[name=sow-sheet-url]').focus();
    await p.locator('.more-sec', { hasText: 'Connections' }).scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    await shot('3-connections-masked');
    console.log(tag, 'errors', errs.length); await ctx.close();
  }
  await b.close();
})();
