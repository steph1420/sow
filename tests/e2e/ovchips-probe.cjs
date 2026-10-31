// P2-2 (v0.27.0): Overview date chips carry DD/MM and overflow is a scroller with an edge fade.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  let fails = 0; const ok = (c, m) => { console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  for (const [w,h] of [[360,780],[412,915]]) {
    const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
    await p.goto(url, { waitUntil:'networkidle' }); await p.waitForTimeout(400);
    const chips = await p.$$eval('.ov-slide:last-child .ov-f', e => e.map(x => x.textContent));
    ok(chips.slice(1).every(t => /\b\d{1,2}\/\d{1,2}\b/.test(t)), `${w}: date chips have DD/MM ${JSON.stringify(chips)}`);
    const st = await p.$eval('.ov-filters', e => ({ sw: e.scrollWidth, cw: e.clientWidth, cls: e.className, mask: getComputedStyle(e).webkitMaskImage || getComputedStyle(e).maskImage }));
    if (st.sw > st.cw + 1) {
      ok(/fade-r/.test(st.cls) && /gradient/.test(st.mask), `${w}: overflowing → right fade (${st.sw}>${st.cw})`);
      await p.$eval('.ov-filters', e => e.scrollTo({ left: e.scrollWidth }));
      await p.waitForTimeout(250);
      const end = await p.$eval('.ov-filters', e => ({ cls: e.className, last: e.querySelector('.ov-slide:last-child .ov-f:last-child').getBoundingClientRect().right, right: e.getBoundingClientRect().right }));
      ok(!/fade-r/.test(end.cls) && /fade-l/.test(end.cls), `${w}: at end → left fade only`);
      ok(end.last <= end.right + 0.5, `${w}: last chip fully reachable`);
    } else ok(true, `${w}: no overflow`);
    await p.close();
  }
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
