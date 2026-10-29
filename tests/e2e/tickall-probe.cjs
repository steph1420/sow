// P1-3 (v0.27.0): partial column header shows dash (aria-checked=mixed), all-ticked shows ✓.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915} });
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto(url+'#checklist/KGA_Eng_CW', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  const boxes = () => p.$$eval('.sw-allbox', els => els.map(e => ({ st: e.dataset.state, aria: e.getAttribute('aria-checked'), dash: !!e.querySelector('[data-glyph=dash]'), svg: e.querySelectorAll('svg').length })));
  let bx = await boxes();
  if (!bx.some(x => x.st === 'partial')) { await p.locator('.sw-check-hit').first().click(); await p.waitForTimeout(300); bx = await boxes(); }
  console.log(JSON.stringify(bx));
  const part = bx.find(x => x.st === 'partial');
  ok(!!part && part.dash && part.aria === 'mixed', 'partial → dash + aria mixed');
  // tick all on that column → ✓
  const i = bx.findIndex(x => x.st === 'partial');
  await p.locator('.sw-allbox').nth(i).click(); await p.waitForTimeout(300);
  const after = (await boxes())[i];
  ok(after.st === 'on' && !after.dash && after.svg === 1 && after.aria === 'true', 'tap partial → all on, ✓ glyph');
  await p.locator('.sw-allbox').nth(i).click(); await p.waitForTimeout(300);
  const off = (await boxes())[i];
  ok(off.st === 'off' && off.svg === 0, 'tap on → off, empty');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
