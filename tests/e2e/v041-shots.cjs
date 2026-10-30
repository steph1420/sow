// v0.41.0 screenshots: ⋮ menu, stuck header, undo toast, date dials, contrast — 412x915 + 1440x900, Night + Day. Demo data only.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4317/sow/'; const out = process.argv[3] || '/workspace/shots-v041';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const notes = [];
  for (const [w, h, mob] of [[412, 915, true], [1440, 900, false]]) for (const theme of ['night', 'day']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate((t) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme: t })) }, theme);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
    const tag = `${w}x${h}-${theme}`; const shot = (n) => p.screenshot({ path: `${out}/${tag}-${n}.png` });
    const click = async (s) => { await p.locator(s).first().click(); await p.waitForTimeout(350); };
    await shot('1-header');
    await click('.sw-kebab'); await shot('2-menu');
    const mr = await p.$eval('.sw-menu', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom] });
    notes.push(`${tag} menu ${mr.map(Math.round)} vw ${w}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await click('[data-cell="0-0"]'); await click('[aria-label=Undo]'); await shot('3-undo-toast');
    await p.mouse.move(w / 2, h / 2); await p.mouse.wheel(0, 900); await p.waitForTimeout(600); await shot('4-stuck');
    await p.mouse.wheel(0, -3000); await p.waitForTimeout(600);
    await click('.sw-lean-dates'); await p.waitForTimeout(300);
    await p.$eval('.dp-picker', (e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await shot('5-datepicker');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.goto(url + '#settings/appearance', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const has = await p.$('input[type=range][aria-label=Contrast]');
    if (has) { await has.scrollIntoViewIfNeeded(); await shot('6-contrast'); }
    notes.push(`${tag} contrast-slider:${!!has} errors:${errs.length}`);
    await ctx.close();
  }
  console.log(notes.join('\n')); await b.close();
})();
