const { chromium } = require('playwright-core');
const [url] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
  await p.goto(url, { waitUntil:'networkidle' });
  if (!(await p.$('.sw-list-wrap'))) { await p.getByText('Open Checklist').first().click(); await p.waitForTimeout(800); }
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
  };
  await run(0.85,'down→W'); await run(0.05,'up→A'); await run(0.98,'end-clamp');
  // rapid scrub
  await p.mouse.move(az.x+az.width/2, az.y+5); await p.mouse.down();
  for (let i=0;i<20;i++){ await p.mouse.move(az.x+az.width/2, az.y+az.height*(i/20)); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(600);
  console.log('rapid-end', await p.evaluate(()=>({y:document.querySelector('.sw-list-wrap').scrollTop, chrome:document.querySelector('.sw-chrome')?.className})));
  await b.close();
})();
