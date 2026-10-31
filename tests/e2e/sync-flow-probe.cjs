// v0.27.0 fresh-install sync flow (v0.44.5: against the TEST copy via Beta, never the live sheet): P0-1 (no phantom Submitted), P2-1 (History honest), P2-4 (KGB HW note).
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true }); await require('./_launch.cjs').betaInit(ctx);
  const p = await ctx.newPage();
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const go = async h => { await p.goto(url+h); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400); };
  await go('');
  const pre = await p.textContent('.app-main');
  ok(!/Submitted [1-9]/.test(pre), 'pre-sync: Beta starts on its own empty TEST cache (no demo Submitted)');
  await require('./_launch.cjs').setTestCopy(p, url); // v0.44.5: TEST copy only
  await go('#settings/sync');
  await p.waitForFunction(() => !document.querySelector('.sync-cta')?.disabled, null, { timeout: 30000 });
  await require('./_launch.cjs').dismissNudge(p); await p.click('.sync-cta');
  await p.waitForFunction(() => /pulled \d+ students/i.test(document.body.textContent), null, { timeout: 60000 });
  const syncTxt = await p.textContent('body');
  console.log('   sync:', (syncTxt.match(/pulled[^·]*·[^·]*/i)||[''])[0]);
  ok(/pulled [1-9]\d* students · [1-9]\d* marks/i.test(syncTxt), 'bridge pull brought students + marks from the TEST copy');
  global.__syncTxt = syncTxt;
  await go('');
  const ov = await p.textContent('.app-main');
  ok(!/Submitted [1-9]/.test(ov), 'post-sync Overview: no phantom Submitted');
  await go('#history');
  const hint = await p.textContent('.more-hint');
  ok(!/Demo/.test(hint) && /From your sheet/.test(hint), 'History copy honest: '+hint.slice(0,60));
  const rows = await p.$$eval('.history-item', els => els.map(e => e.querySelector('.k').textContent + ' ' + e.querySelector('.line b').textContent));
  console.log('   rows:', rows.join(' | '));
  ok(rows.length === 7, 'History lists every pulled date (7)');
  await go('#settings/sync');
  const after = await p.textContent('body');
  const warnTxt = await p.$$eval('.more-hint', e => e.filter(x => getComputedStyle(x).color === getComputedStyle(document.documentElement).getPropertyValue('--warn') || x.style.color).map(x => x.textContent).join(' '));
  ok(!/col D/.test(warnTxt), 'P2-4: col D is not a sticky warning');
  const note = await p.$eval('.sync-note', e => e.textContent).catch(() => '');
  // v0.44.5: the col-D note belonged to the old gviz parser; the bridge path reads every tab, so no note is expected.
  ok(!/col D/.test(note), 'P2-4: bridge path has no col-D note: ' + (note.slice(0, 80) || 'none'));
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
