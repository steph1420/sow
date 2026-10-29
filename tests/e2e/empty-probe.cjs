// Unverified item (dogfood): empty Checklist "Open Session →" loop. Fresh IDB (new context + deleteDatabase before boot).
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  for (const h of ['#checklist', '#checklist/KGA_Math_CW', '#checklist/KGB_Eng_HW']) {
    const ctx = await b.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
    await ctx.addInitScript(() => { if (!sessionStorage.__wiped) { sessionStorage.__wiped = 1; for (const n of ['sow','sow-db','sow-pwa']) indexedDB.deleteDatabase(n); } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url+h, { waitUntil:'networkidle' }); await p.waitForTimeout(2500);
    const hl = await p.evaluate(() => history.length);
    const body = await p.textContent('body');
    ok(!errs.length, `${h}: no page errors ${errs.join(';')}`);
    ok(hl <= 4, `${h}: no history loop (length ${hl})`);
    ok(!/Open Session/.test(body), `${h}: no "Open Session →" loop UI`);
    if (/Math/.test(h)) ok(/#checklist\/KGA_Eng_CW/.test(p.url()) && !/Math/.test(await p.textContent('.sw-lean-class')), `${h}: non-sheet class falls back (${p.url()})`);
    console.log('   view:', (await p.$('.sw-list-wrap')) ? 'Checklist list rows=' + (await p.$$eval('.sw-row', e => e.length)) : body.slice(0, 80));
    await ctx.close();
  }
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
