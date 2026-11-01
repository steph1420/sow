const { chromium } = require('playwright-core');
const [url] = process.argv.slice(2);
// v0.46.0-beta.4 (t29u): now asserts (was measurement-only, 0 PASS/FAIL lines).
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  await p.goto(url, { waitUntil:'networkidle' });
  if (!(await p.$('.sw-list-wrap'))) { await p.locator('.ov-act-open').first().click(); await p.waitForTimeout(800); }
  const az = await (await p.$('.sw-az')).boundingBox();
  const run = async (frac, label) => {
    await p.evaluate(() => { const w=document.querySelector('.sw-list-wrap'); window.__s=[]; const t0=performance.now(); let last=w.scrollTop, still=0;
      const f=()=>{ const y=w.scrollTop; window.__s.push([performance.now()-t0,y]); if(Math.abs(y-last)<0.5) still++; else still=0; last=y; if(still<20) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const x=az.x+az.width/2, y=az.y+az.height*frac;
    await p.mouse.move(x,y); await p.mouse.down(); await p.waitForTimeout(30); await p.mouse.up();
    await p.waitForTimeout(1500);
    const s = await p.evaluate(()=>window.__s);
    const ys=s.map(a=>a[1]); const y0=ys[0], yf=ys[ys.length-1];
    const moving=s.filter(a=>Math.abs(a[1]-yf)>1 && Math.abs(a[1]-y0)>0.5);
    const startT=(s.find(a=>Math.abs(a[1]-y0)>0.5)||[0])[0]; const endT=(s.find(a=>Math.abs(a[1]-yf)<=1 && a[0]>startT)||[0])[0];
    const lean = await p.evaluate(()=>document.querySelector('.sw-chrome')?.className);
    console.log(label, JSON.stringify({from:y0,to:yf,durMs:Math.round(endT-startT),chrome:lean}));
    return { from: y0, to: yf, dur: Math.round(endT - startT) };
  };
  ok(!!(await p.$('[data-az-grip]')), 'beta.4 grip present above the strip');
  const w = await run(0.85,'down→W'); ok(w.to > w.from + 200 && w.dur > 0 && w.dur < 500, `tap W scrolls down with a short tween (${w.from}→${w.to}, ${w.dur} ms)`);
  const a = await run(0.05,'up→A'); ok(a.to < w.to - 200 && a.to < 200 && a.dur < 500, `tap A scrolls back near the top (${a.to}, ${a.dur} ms)`);
  const e = await run(0.98,'end-clamp'); const max = await p.evaluate(() => { const x = document.querySelector('.sw-list-wrap'); return x.scrollHeight - x.clientHeight; });
  ok(e.to <= max + 1 && e.to >= w.to, `tap at the bottom stays within the list (${e.to} ≤ ${max})`);
  // rapid scrub
  await p.mouse.move(az.x+az.width/2, az.y+5); await p.mouse.down();
  for (let i=0;i<20;i++){ await p.mouse.move(az.x+az.width/2, az.y+az.height*(i/20)); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(600);
  const r = await p.evaluate(()=>({y:document.querySelector('.sw-list-wrap').scrollTop, chrome:document.querySelector('.sw-chrome')?.className}));
  console.log('rapid-end', r); ok(r.y > 0 && !!(await p.$('.sw-az')), 'rapid scrub ends scrolled, strip still there');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})();
