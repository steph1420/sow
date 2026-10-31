// P1-1 (v0.27.0): reload restores current screen via hash routes; back still unwinds.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const back = async () => { await p.goBack({ waitUntil:'commit' }).catch(()=>{}); await p.waitForTimeout(350); };
  const isList = () => p.$('.sw-list-wrap').then(Boolean);
  const title = () => p.$eval('.more-heading', e=>e.textContent).catch(()=>null);
  await p.goto('about:blank'); await p.goto(url, { waitUntil:'networkidle' }); await p.waitForTimeout(400);
  await p.locator('.tabbar .tab').nth(1).click(); await p.waitForTimeout(300);
  ok(/#checklist\/KGA_Eng_CW$/.test(p.url()), 'checklist hash '+p.url());
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500);
  ok(await isList(), 'reload on Checklist stays on Checklist');
  await back(); ok(!(await isList()), 'back after reload → Overview');
  ok(!/#/.test(p.url()) || p.url().endsWith('#'), 'overview hash cleared '+p.url());
  await p.locator('.tabbar .tab').nth(2).click(); await p.locator('.more-item').nth(2).click(); await p.waitForTimeout(200);
  await p.locator('.hero-card').first().click(); await p.waitForTimeout(300);
  ok(p.url().endsWith('#settings/sync'), 'sync hash '+p.url());
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500);
  ok(await title()==='Sync', 'reload on Sync stays on Sync');
  await back(); ok(await title()==='Settings', 'back → Settings');
  await back(); ok(!(await title()), 'back → Overview');
  await back(); ok(!!(await p.$('.exit-toast')), 'root back → exit toast');
  await p.goto('about:blank'); await p.goto(url+'#checklist/KGB_Eng_HW',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
  const t = await p.textContent('.sw-list-wrap, body'); 
  ok(await isList() && /KGB/.test(await p.textContent('body')), 'deep link #checklist/KGB_Eng_HW opens that class');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
