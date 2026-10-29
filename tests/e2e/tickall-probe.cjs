// P1-3 → v0.40.0 (t83u): tick all lives in the footer row. Partial → "Tick all", all on → "Untick all".
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915} });
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto(url+'#checklist/KGA_Eng_CW', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  const btns = () => p.$$eval('.sw-tickall', els => els.map(e => ({ st: e.dataset.state, t: e.textContent })));
  let bx = await btns();
  if (!bx.some(x => x.st === 'partial')) { await p.locator('.sw-check-hit').first().click(); await p.waitForTimeout(300); bx = await btns(); }
  console.log(JSON.stringify(bx));
  const i = bx.findIndex(x => x.st === 'partial');
  ok(i >= 0 && bx[i].t === 'Tick all', 'partial column → "Tick all"');
  await p.locator('.sw-tickall').nth(i).click(); await p.waitForTimeout(300);
  const after = (await btns())[i];
  ok(after.st === 'on' && after.t === 'Untick all', 'tap → all on, "Untick all"');
  await p.locator('.sw-tickall').nth(i).click(); await p.waitForTimeout(300);
  const off = (await btns())[i];
  ok(off.st === 'off' && off.t === 'Tick all', 'tap → off, "Tick all"');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
