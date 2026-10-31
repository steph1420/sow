const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  for (const theme of ['day','night']) {
    const p = await b.newPage({ viewport:{width:412,height:915}, deviceScaleFactor:2, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
    await p.goto(url,{waitUntil:'networkidle'});
    const set = () => p.evaluate(t => { if (t==='day') document.documentElement.setAttribute('data-theme','day'); else document.documentElement.removeAttribute('data-theme'); }, theme);
    await set(); await p.waitForTimeout(200);
    await p.screenshot({path:`/workspace/shots-v0263/${theme}-overview.png`});
    await p.locator('.tabbar .tab').nth(1).click(); await p.waitForTimeout(400); await set();
    const az = await p.$eval('.sw-az', e=>getComputedStyle(e).backgroundColor).catch(()=>'n/a');
    const tb = await p.$eval('.tabbar', e=>getComputedStyle(e).backgroundColor);
    const on = await p.$eval('.tab.on', e=>getComputedStyle(e).color);
    console.log(theme, JSON.stringify({az, tabbar:tb, activeTab:on}));
    await p.screenshot({path:`/workspace/shots-v0263/${theme}-checklist.png`});
    await p.locator('.tabbar .tab').nth(2).click(); await p.waitForTimeout(300);
    await p.screenshot({path:`/workspace/shots-v0263/${theme}-more.png`});
    await p.locator('.more-item').nth(0).click(); await p.waitForTimeout(300);
    await p.screenshot({path:`/workspace/shots-v0263/${theme}-roster.png`});
    await p.close();
  }
  await b.close();
})();
