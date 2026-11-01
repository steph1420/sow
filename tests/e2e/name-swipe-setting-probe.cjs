// t14u — Developer › "Swipe from name" (gestures.nameSwipeFrom: Off / 30% / 50% / 70%, default 50%).
// REAL touch (CDP) 412x915. For each setting, start at 20/40/60/80% of the name and swipe across both boxes:
// boxes change only when the start is at/after the setting (never when Off). Demo data only.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  for (const from of [0, 0.3, 0.5, 0.7]) {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((f) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow.dateCols', '2'); localStorage.setItem('sow-app.prefs.v1', JSON.stringify({ 'gestures.nameSwipeFrom': f })); }, from);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    const rolls = ['3', '4', '5', '6'];
    for (const [i, frac] of [0.2, 0.4, 0.6, 0.8].entries()) {
      const roll = rolls[i];
      const g = await p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => { const n = r.querySelector('.sw-name').getBoundingClientRect(); const c = [...r.querySelectorAll('.sw-check-hit')].map((e) => e.getBoundingClientRect().right); const rr = r.getBoundingClientRect(); return { nl: n.left, nw: n.width, cy: rr.top + rr.height / 2, end: c[c.length - 1] }; });
      const s0 = await p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => [...r.querySelectorAll('.sw-check')].map((c) => c.classList.contains('on')).join());
      const x = g.nl + g.nw * frac;
      await touch('touchStart', x, g.cy);
      for (let k = 1; k <= 8; k++) { await touch('touchMove', x + ((g.end + 6 - x) * k) / 8, g.cy + 1); await p.waitForTimeout(18); }
      await touch('touchEnd'); await p.waitForTimeout(200);
      const s1 = await p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => [...r.querySelectorAll('.sw-check')].map((c) => c.classList.contains('on')).join());
      const expect = from > 0 && frac >= from;
      ok((s0 !== s1) === expect, `from ${from || 'Off'} · start ${frac * 100}% → ${expect ? 'swipe' : 'no swipe'} (${s0} → ${s1})`);
    }
  }
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
