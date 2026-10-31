// P2-3 (v0.27.0): tapping the Checklist class title/topic does not leave Checklist.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto(url+'#checklist/KGA_Eng_CW'); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400);
  await p.tap('.sw-lean-class'); await p.waitForTimeout(300);
  ok(!!(await p.$('.sw-list-wrap')), 'tap class title stays on Checklist');
  // v0.40.0: topic left the header; the dates button opens the Dates panel (still on Checklist).
  await p.tap('.sw-lean-dates'); await p.waitForTimeout(300);
  ok(!!(await p.$('.sw-list-wrap')) && await p.isVisible('.dpo'), 'tap header dates opens the date popover, stays on Checklist');
  ok(await p.$eval('.sw-lean-left', e => e.tagName !== 'BUTTON'), 'title is not a button');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
