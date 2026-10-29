// v0.31.0 (Steve t5u) — REAL touch (CDP). "Make the swipe recognised from about half the length of the
// name row. But checkboxes only respond when I cross over them."
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const STYLES = ['blue', 'tint', 'ghost', 'sliver', 'wash', 'ghostTint'];
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const fresh = async (prefs = {}) => {
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((pr) => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); localStorage.setItem('sow-app.prefs.v1', JSON.stringify(pr)); }, prefs);
    await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  };
  // a row with both boxes unticked if possible, else any with an unticked box
  const pick = (skip = []) => p.$$eval('.sw-row', (rows, skip) => {
    const vis = rows.filter((x) => !skip.includes(+x.dataset.roll) && x.getBoundingClientRect().top > 220 && x.getBoundingClientRect().bottom < 760);
    const r = vis.find((x) => x.querySelectorAll('.sw-check.on').length === 0) || vis.find((x) => x.querySelector('.sw-check:not(.on)'));
    return +r.dataset.roll;
  }, skip);
  const geo = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => {
    const n = r.querySelector('.sw-name').getBoundingClientRect(); const c = [...r.querySelectorAll('.sw-check-hit')].map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.right]; });
    const rr = r.getBoundingClientRect(); return { nl: n.left, nw: n.width, cy: rr.top + rr.height / 2, c, rh: rr.height };
  });
  const state = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => [...r.querySelectorAll('.sw-check')].map((c) => c.classList.contains('on')));
  const cue = (roll) => p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => /paint-glow|\bpc\b/.test(r.className));
  const swipe = async (pts, holdCheck) => { await touch('touchStart', pts[0][0], pts[0][1]); let seen = null; for (let i = 1; i < pts.length; i++) { await touch('touchMove', pts[i][0], pts[i][1]); await p.waitForTimeout(18); if (holdCheck && i === holdCheck.at) seen = await holdCheck.fn(); } await touch('touchEnd'); await p.waitForTimeout(150); return seen; };

  await fresh();
  let roll = await pick(); let g = await geo(roll); let s0 = await state(roll);
  const x60 = g.nl + g.nw * 0.6, x30 = g.nl + g.nw * 0.3, gap = g.c[0][0] - 6, mid = (g.c[0][1] + g.c[1][0]) / 2 - 2, end = g.c[1][1] + 6;
  // 1. from 60% of the name, horizontal but stopping before the first box → recognised, nothing ticks, no cue
  let cueSeen = await swipe([[x60, g.cy], [x60 + 14, g.cy], [x60 + 30, g.cy], [gap, g.cy + 1], [gap, g.cy + 1]], { at: 4, fn: () => cue(roll) });
  ok(JSON.stringify(await state(roll)) === JSON.stringify(s0) && !cueSeen, `60% start, no box crossed → no tick, no cue (${s0}→${await state(roll)})`);
  // 2. cross only the first box → only date 1 ticks
  await swipe([[x60, g.cy], [x60 + 14, g.cy], [x60 + 40, g.cy], [g.c[0][0] + 10, g.cy], [mid, g.cy + 1]]);
  let s1 = await state(roll);
  ok(s1[0] === !s0.every(Boolean) && s1[1] === s0[1], `cross box 1 only → only box 1 changes (${s0}→${s1})`);
  // 3. cross both boxes on another row → both tick
  roll = await pick([roll]); g = await geo(roll); s0 = await state(roll);
  await swipe([[g.nl + g.nw * 0.6, g.cy], [g.nl + g.nw * 0.6 + 14, g.cy], [g.c[0][0] + 8, g.cy], [g.c[1][0] + 8, g.cy], [g.c[1][1] + 6, g.cy]]);
  ok((await state(roll)).every(Boolean), `cross both boxes → both ticked (${s0}→${await state(roll)})`);
  // 4. start in the left half (30%) → not armed, nothing ticks even crossing both
  roll = await pick([roll]); g = await geo(roll); s0 = await state(roll);
  await swipe([[g.nl + g.nw * 0.3, g.cy], [g.nl + g.nw * 0.3 + 14, g.cy], [g.c[0][0] + 8, g.cy], [g.c[1][1] + 6, g.cy]]);
  ok(JSON.stringify(await state(roll)) === JSON.stringify(s0), `30% start (left half) → not recognised, no tick`);
  // 5/6. vertical drags from 60% and from the left half → native scroll, no ticks
  for (const [lab, fx] of [['60%', 0.6], ['left half 20%', 0.2]]) {
    await fresh();
    const before = await p.$$eval('.sw-check.on', (e) => e.length);
    roll = await p.$$eval('.sw-row', (rows) => +rows.find((x) => x.getBoundingClientRect().top > 520).dataset.roll); g = await geo(roll);
    const t0 = await p.$eval('.sw-list-wrap', (e) => e.scrollTop); const x = g.nl + g.nw * fx;
    await touch('touchStart', x, g.cy); for (let i = 1; i <= 8; i++) { await touch('touchMove', x + (i % 2), g.cy - i * 40); await p.waitForTimeout(8); } await touch('touchEnd');
    const t1 = await p.$eval('.sw-list-wrap', (e) => e.scrollTop); await p.waitForTimeout(300);
    ok(t1 - t0 > 200 && (await p.$$eval('.sw-check.on', (e) => e.length)) === before, `${lab}: vertical drag scrolls natively ${t0}→${t1}, no ticks`);
  }
  // 7. quick (~50 ms) swipe from the name across both boxes → ticks
  await fresh(); roll = await pick(); g = await geo(roll);
  await touch('touchStart', g.nl + g.nw * 0.6, g.cy); await touch('touchMove', g.nl + g.nw * 0.6 + 20, g.cy); await touch('touchMove', g.c[1][1] + 6, g.cy + 1); await p.waitForTimeout(16); await touch('touchEnd'); await p.waitForTimeout(150);
  ok((await state(roll)).every(Boolean) && !(await cue(roll)), `quick swipe from name across both → ticked, cue gone`);
  // 8. long-press on the name still enters Select
  roll = await pick([roll]); g = await geo(roll);
  await touch('touchStart', g.nl + g.nw * 0.6, g.cy); await p.waitForTimeout(1000); await touch('touchEnd'); await p.waitForTimeout(150);
  ok(!!(await p.$('.sw-sel-bar')), 'long-press on the name (right half) still enters Select');
  // 9. Dev Off → name swipe does nothing
  await fresh({ 'gestures.nameSwipeFrom': 0 }); roll = await pick(); g = await geo(roll); s0 = await state(roll);
  await swipe([[g.nl + g.nw * 0.6, g.cy], [g.nl + g.nw * 0.6 + 14, g.cy], [g.c[0][0] + 8, g.cy], [g.c[1][1] + 6, g.cy]]);
  ok(JSON.stringify(await state(roll)) === JSON.stringify(s0), 'Dev "Swipe from name: Off" → name swipe ignored');
  // 10. all 6 confirm styles × Set/Submitted: no cue before crossing, cue after, only crossed box commits
  for (const mode of ['set', 'submitted']) for (const style of STYLES) {
    await fresh({ 'gestures.swipeConfirmStyle': style });
    if (mode === 'submitted') { await p.click('.sw-tools-chip'); await p.click('.sw-modebar button:nth-child(2)'); await p.click('.sw-tools-row.mute'); await p.waitForTimeout(200); }
    roll = await pick(); g = await geo(roll); s0 = await state(roll);
    const xs = g.nl + g.nw * 0.6;
    await touch('touchStart', xs, g.cy); await touch('touchMove', xs + 14, g.cy); await touch('touchMove', g.c[0][0] - 6, g.cy); await p.waitForTimeout(30);
    const pre = await cue(roll);
    await touch('touchMove', g.c[0][0] + 10, g.cy); await p.waitForTimeout(30);
    const post = await cue(roll);
    const ghostOnOther = await p.$eval(`.sw-row[data-roll="${roll}"]`, (r) => { const c = r.querySelectorAll('.sw-check')[1]; const a = getComputedStyle(c, '::after'); return a.content !== 'none' && parseFloat(a.opacity) > 0 || c.classList.contains('pending'); });
    await touch('touchMove', mid, g.cy); await touch('touchEnd'); await p.waitForTimeout(150);
    const s1 = await state(roll);
    ok(!pre && post && !ghostOnOther && s1[0] === !s0.every(Boolean) && s1[1] === s0[1], `${style}/${mode}: cue only after crossing, only on the crossed box, only it commits (pre ${pre} post ${post} other ${ghostOnOther} ${s0}→${s1})`);
  }
  console.log(`RESULT ${fails} fails`);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
