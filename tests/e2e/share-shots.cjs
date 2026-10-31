// v0.28 screenshots — Day + Night: overview, tools, chooser, settings (412×915 @1x).
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const out = process.argv[3] || '/workspace/shots-v028';
(async () => {
  const { b, p } = await phone({ deviceScaleFactor: 1 });
  p.setDefaultTimeout(5000);
  for (const theme of ['night', 'day']) {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((theme) => { localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ theme })); }, theme);
    await p.goto(url, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/${theme}-overview.png` });
    await p.locator('.ov-act-share').first().tap(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${theme}-chooser.png` });
    await p.goBack(); await p.waitForTimeout(300);
    await p.locator('.ov-act-open').first().tap(); await p.waitForTimeout(500);
    await p.locator('.sw-tools-chip').tap(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${theme}-tools.png` });
    await p.locator('.sw-tools-row.share').tap(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${theme}-chooser-checklist.png` });
    // v0.29.0 removed the sheet's manage link (t170u #2) → open Settings → Sharing by route.
    await p.goto(url + '#settings/sharing'); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.locator('.shr-row .shr-title').nth(2).tap(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${theme}-settings.png` });
    await p.screenshot({ path: `${out}/${theme}-settings-full.png`, fullPage: true });
    await p.locator('.more-body').evaluate((e) => e.scrollTo(0, e.scrollHeight)); await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/${theme}-settings-bottom.png` });
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
