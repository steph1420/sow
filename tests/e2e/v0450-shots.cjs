// v0.45.0 shots: auto-save icon, Settings › Backups, restore confirm, restored toast. 412x915 + 1440x900, Night + Day. DEMO names only.
const { chromium, launchOpts } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const out = process.argv[3] || '/workspace/sow-shots/v0450';
const DEMO = ['Aarav Demo','Bela Sample','Chirag Test','Diya Example','Esha Mock','Farhan Demo','Gita Sample','Hari Test','Ira Demo','Jai Sample','Kavya Test','Leo Example','Mira Mock','Neel Demo','Ojas Sample','Pia Test'];
(async () => {
  const b = await chromium.launch(launchOpts);
  for (const [w, h, mobile] of [[412, 915, true], [1440, 900, false]]) for (const theme of ['night', 'day']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    await ctx.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} });
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    const demo = () => p.evaluate((demo) => { let k = 0; document.querySelectorAll('.sw-name').forEach((e) => { e.textContent = demo[k++ % demo.length] }); }, DEMO);
    const th = () => p.evaluate((t) => { if (t === 'day') document.documentElement.setAttribute('data-theme', 'day'); else document.documentElement.removeAttribute('data-theme'); }, theme);
    const shot = async (n) => { await demo(); await th(); await p.waitForTimeout(120); await p.screenshot({ path: `${out}/${theme}-${w}x${h}-${n}.png` }); };
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' });
    await p.evaluate(() => indexedDB.deleteDatabase('sow-app')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
    await th(); await demo();
    const nudge = p.getByRole('button', { name: 'Not now', exact: true }); if (await nudge.count()) await nudge.first().click().catch(() => {});
    await p.locator('[role=checkbox]').nth(3).click();
    await p.waitForSelector('.as[data-state=saving]', { timeout: 5000 }); await shot('1-saving');
    await p.waitForSelector('.as[data-state=saved]', { timeout: 5000 }); await shot('2-saved');
    await p.locator('[role=checkbox]').nth(5).click(); await p.waitForTimeout(3500);
    await p.click('.sw-kebab'); await shot('3-menu-restore');
    await p.click('[data-item=restore]'); await p.waitForSelector('.bk-row[data-snap]');
    await p.click('.bk-now'); await p.waitForTimeout(400); await shot('4-backups');
    await p.locator('.bk-row[data-snap] .bk-go').last().click(); await p.waitForSelector('.bk-warn'); await shot('5-restore-confirm');
    await p.click('.bk-amber'); await p.waitForSelector('.toast'); await p.waitForTimeout(500); await shot('6-restored-toast');
    await p.goto(url + '#settings', { waitUntil: 'networkidle' }); await p.waitForSelector('.bk'); await p.locator('.bk').scrollIntoViewIfNeeded(); await shot('7-settings-backups');
    await ctx.setOffline(true); await p.goto(url + '#checklist/KGB_Eng_CW').catch(() => {}); await p.waitForTimeout(900);
    await p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await p.locator('[role=checkbox]').nth(7).click(); await p.locator('[role=checkbox]').nth(9).click(); await p.waitForTimeout(800); await shot('8-offline-queued');
    await ctx.close();
  }
  await b.close(); console.log('shots done');
})().catch((e) => { console.error(e); process.exit(2); });
