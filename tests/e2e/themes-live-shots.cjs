// v0.35.0 colour themes: real-touch picker at 412x915, Night then Day; checklist per theme. Screens → sow-mockups/themes-live-*.png
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4191/sow/';
const OUT = process.argv[3] || '/workspace/sow-mockups';
(async () => {
  const { b, p } = await phone();
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  const app = async (h) => { await p.goto(url + h, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); };
  await app('#settings/appearance'); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const names = await p.locator('.palette-row .palette-name').allTextContents();
  ok(names.length === 9 && names[0] === 'Default (Quiet Lucid)', 'picker lists Default + 8: ' + names.join(' | '));
  const secs = await p.locator('.more-sec').allTextContents();
  ok(secs.indexOf('Colour theme') > -1 && secs.indexOf('Colour theme') < secs.indexOf('Mode'), 'picker sits above Mode');
  const h = (await p.locator('.palette-row').first().boundingBox()).height;
  ok(h >= 44, 'rows ≥44px: ' + h);
  const ids = await p.locator('.palette-row').count();
  for (const mode of ['night', 'day']) {
    await app('#settings/appearance');
    await tap(p.getByRole('button', { name: mode === 'day' ? 'Day' : 'Night', exact: true }));
    await tap(p.locator('.palette-row').nth(0));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/themes-live-picker-${mode}.png` });
    for (let i = 1; i < ids; i++) {
      await app('#settings/appearance');
      await tap(p.locator('.palette-row').nth(i));
      await p.waitForTimeout(250);
      const pal = await p.evaluate(() => document.documentElement.dataset.palette);
      const slug = pal;
      if (i === 7) await p.screenshot({ path: `${OUT}/themes-live-picker-${mode}-${slug}.png` });
      await app('#checklist/KGA_Eng_CW');
      // tick two rows so the filled tick shows
      const checks = p.locator('.sw-row');
      for (const k of [0, 1]) { const r = checks.nth(k); if (await r.count()) { const on = await r.locator('.sw-check.on').count(); if (!on) await tap(r.locator('.sw-check')); } }
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/themes-live-${mode}-${slug}.png` });
      const st = await p.evaluate(() => ({ th: document.documentElement.dataset.theme, pal: document.documentElement.dataset.palette, bg: getComputedStyle(document.body).backgroundColor, sub: getComputedStyle(document.documentElement).getPropertyValue('--sub').trim() }));
      ok(st.th === mode && st.pal === slug, `${mode} ${slug} applied (bg ${st.bg}, --sub ${st.sub})`);
    }
  }
  // persistence across reload (IndexedDB)
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  ok((await p.evaluate(() => document.documentElement.dataset.palette)) === '8-black-and-pink', 'choice persists after reload');
  await b.close(); console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
