// Unverified item: Tools → Copy marks (date1→date2) then undo; real touch taps.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto(url+'#checklist/KGA_Eng_CW'); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500);
  const cols = () => p.$$eval('.sw-row', rows => rows.map(r => [...r.querySelectorAll('.sw-check')].map(c => c.classList.contains('on'))));
  const before = await cols();
  await p.tap('.sw-kebab'); await p.waitForTimeout(200);
  await p.locator('.sw-menu-row', { hasText: 'Copy marks' }).tap(); await p.waitForTimeout(200);
  await p.locator('.sw-copy-sheet button').first().tap(); await p.waitForTimeout(400);
  const after = await cols();
  ok(after.every(r => r[1] === r[0]), 'copy date1 → date2 makes col2 equal col1');
  ok(after.some((r, i) => r[1] !== before[i][1]), 'copy changed something');
  const undo = p.locator('.sw-icon-btn').first(); await undo.tap(); await p.waitForTimeout(300);
  ok(JSON.stringify(await cols()) === JSON.stringify(before), 'undo restores');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
