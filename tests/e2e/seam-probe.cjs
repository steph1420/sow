const { chromium } = require('playwright-core');
const [url, tag] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true });
  await p.goto(url, { waitUntil:'networkidle' });
  if (!(await p.$('.sw-list-wrap'))) {
    await p.locator('.ov-act-open').first().click();
    await p.waitForTimeout(800);
  }
  if (!(await p.$('.sw-list-wrap'))) { await p.screenshot({path:`/workspace/shots-v0261/${tag}-nolist.png`}); console.log('no list'); await b.close(); return; }
  let fails=0, checks=0;
  const probe = async (label, shot) => {
    const r = await p.evaluate(() => {
      const ch = document.querySelector('.sw-colhead'); const lean = document.querySelector('.sw-lean');
      const cr = ch.getBoundingClientRect(), lr = lean.getBoundingClientRect();
      const out=[]; 
      const chrome=document.querySelector('.sw-chrome'); const bot = chrome ? chrome.getBoundingClientRect().bottom : cr.bottom; for (let y=Math.floor(lr.bottom)-1; y<Math.floor(bot); y++) for (const x of [30,120,250,330]) {
        const el=document.elementFromPoint(x,y); if (el && (el.closest('.sw-row') || (chrome && !el.closest('.sw-chrome')))) out.push([x,y]);
      }
      return { gap: cr.top - lr.bottom, leanBottom: lr.bottom, colTop: cr.top, colBottom: cr.bottom, rowHits: out.length };
    });
    checks++; if (r.rowHits || (r.colTop - r.leanBottom) > 8) fails++;
    console.log(label, JSON.stringify(r));
    if (shot) await p.screenshot({ path:`/workspace/shots-v0261/${tag}-${label}.png`, clip:{x:0,y:0,width:412,height:360} });
  };
  await probe('top', true);
  const wrap = await p.$('.sw-list-wrap'); const bx = await wrap.boundingBox();
  await p.mouse.move(200, bx.y+200);
  for (let i=0;i<12;i++){ await p.mouse.wheel(0,40); await p.waitForTimeout(60); await probe('down'+i, i===2||i===11); }
  for (let i=0;i<12;i++){ await p.mouse.wheel(0,-40); await p.waitForTimeout(i%3?40:120); await probe('up'+i, i===1||i===5); }
  console.log(`RESULT ${tag}: ${fails} fails / ${checks}`);
  await b.close(); process.exit(fails?1:0);
})();
