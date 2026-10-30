const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true });
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto('about:blank'); // a previous page so "exit" is observable
  await p.goto(url, { waitUntil:'networkidle' }); await p.waitForTimeout(400);
  const back = async () => { await p.goBack({ waitUntil:'commit' }).catch(()=>{}); await p.waitForTimeout(350); };
  const isList = () => p.$('.sw-list-wrap').then(Boolean);
  const title = () => p.$eval('.more-heading', e=>e.textContent).catch(()=>null);
  // Overview -> Checklist -> Tools -> back closes tools -> back to Overview
  await p.locator('.tabbar .tab').nth(1).click(); await p.waitForTimeout(300);
  ok(await isList(), 'checklist open');
  await p.locator('.sw-kebab').click(); await p.waitForTimeout(200);
  ok(!!(await p.$('.sw-menu-row')), 'tools open');
  await back(); ok(!(await p.$('.sw-menu-row')) && await isList(), 'back #1 closes Tools, stays on Checklist');
  await back(); ok(!(await isList()) && p.url().startsWith(url), 'back #2 → Overview');
  // More -> Settings -> Sync -> back x3
  await p.locator('.tabbar .tab').nth(2).click(); await p.waitForTimeout(200);
  ok(!!(await p.$('.more-pop')), 'More popup open');
  await back(); ok(!(await p.$('.more-pop')), 'back closes More popup');
  await p.locator('.tabbar .tab').nth(2).click(); await p.locator('.more-item').nth(2).click(); await p.waitForTimeout(200);
  await p.locator('.hero-card').first().click(); await p.waitForTimeout(300);
  ok(await title()==='Sync', 'Sync page');
  await back(); ok(await title()==='Settings', 'back → Settings');
  // in-app back button keeps stack in sync
  await p.locator('.more-back').click(); await p.waitForTimeout(400);
  ok(await p.locator('.more-back').count()===0 && p.url().startsWith(url), 'in-app ← → Overview');
  // root: back -> toast, stays
  await back(); const t = await p.$('.exit-toast');
  ok(!!t && p.url().startsWith(url), 'root back shows toast, stays in app');
  await p.screenshot({ path:'/workspace/shots-back-toast.png' });
  await back(); await p.waitForTimeout(500);
  ok(p.url()==='about:blank', '2nd back within window leaves app (url='+p.url()+')');
  // toast expiry: re-enter, back, wait >2s, back again => toast again, not exit
  await p.goForward().catch(()=>{}); await p.waitForTimeout(600);
  if (!p.url().startsWith(url)) { await p.goto(url,{waitUntil:'networkidle'}); }
  await p.waitForTimeout(300); await back(); await p.waitForTimeout(2300);
  await back(); ok(p.url().startsWith(url) && !!(await p.$('.exit-toast')), 'after window expires, back re-arms toast instead of exiting');
  // deep link
  await p.goto('about:blank'); await p.goto(url+'#checklist',{waitUntil:'networkidle'}); await p.waitForTimeout(300);
  ok(await isList(), 'deep link #checklist opens Checklist');
  await back(); ok(!(await isList()) && p.url().startsWith(url), 'deep link back → Overview');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
