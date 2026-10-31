// P1-2 (v0.27.0): offline Sync keeps tabs/chips, disables Sync now, shows notice, dirty unchanged.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await require('./_launch.cjs').setSheet(p, url);
  await p.waitForFunction(() => document.querySelectorAll('.subj-pill').length > 1, null, { timeout: 30000 }).catch(()=>{});
  const tabsRow = () => p.$$eval('.more-row-sub', els => els.map(e=>e.textContent).join('|'));
  const dirty = () => p.$$eval('.more-row', els => (els.find(e=>/Local dirty/.test(e.textContent))||{}).textContent);
  const t0 = await tabsRow(), d0 = await dirty(), chips0 = await p.$$eval('.subj-pill', e=>e.map(x=>x.textContent));
  ok(/KGA Eng CW/.test(t0), 'online: tabs discovered '+t0);
  await ctx.setOffline(true); await p.waitForTimeout(300);
  ok(!!(await p.$('.sync-offline')), 'offline notice shown');
  ok(await p.$eval('.sync-cta', e=>e.disabled), 'Sync now disabled offline');
  await p.reload({ waitUntil:'load' }).catch(()=>{}); await p.waitForTimeout(1200);
  ok(!!(await p.$('.sync-offline')), 'offline notice after reload (SW)');
  ok((await tabsRow())===t0, 'tabs kept after offline reload');
  ok(JSON.stringify(await p.$$eval('.subj-pill', e=>e.map(x=>x.textContent)))===JSON.stringify(chips0), 'chips kept');
  ok((await dirty())===d0, 'dirty unchanged '+d0);
  await ctx.setOffline(false); await p.waitForTimeout(400);
  ok(!(await p.$('.sync-offline')) && !(await p.$eval('.sync-cta', e=>e.disabled)), 'back online re-enables');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
