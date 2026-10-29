// v0.38.0 (BUGS t71u/t73u) — touch never shows a focus ring on ANY page; a keydown afterwards does.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, p } = await phone();
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  // any visible ring anywhere: active element or anything with a ≥2px outline
  const ring = () => p.evaluate(() => {
    const els = [document.activeElement, ...document.querySelectorAll('*')].filter(Boolean);
    for (const el of els) { const cs = getComputedStyle(el); if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 && el.getClientRects().length) return (el.className || el.tagName).toString().slice(0, 40); }
    const hl = document.querySelector('.sw-colhead .tick.kb-col'); if (hl && getComputedStyle(hl).boxShadow !== 'none') return 'kb-col header';
    return '';
  });
  const at = async (label) => { await p.waitForTimeout(250); const r = await ring(); ok(!r, `touch ${label}: no ring${r ? ' (' + r + ')' : ''}`); };
  const tap = async (sel) => { await p.tap(sel); await p.waitForTimeout(250); };
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  await at('reload on Checklist');
  await tap('[data-cell="0-0"]'); await at('tick');
  await tap('.sw-tools-chip'); await at('Tools sheet open'); await tap('.sw-copy-scrim'); await at('Tools sheet closed');
  await tap('.tabbar .tab >> nth=0'); await at('Overview');
  ok((await p.$$eval('.ov-card.exp', (e) => e.length)) === 0, 'BUG t75u: Overview after navigation — no card auto-expanded');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok((await p.$$eval('.ov-card.exp', (e) => e.length)) === 0, 'BUG t75u: Overview reload — all cards closed (default)');
  await p.keyboard.press('Tab'); await p.keyboard.press('Control+1'); await p.waitForTimeout(300);
  ok((await p.$$eval('.ov-card.exp', (e) => e.length)) === 0, 'BUG t75u: keyboard landing focuses, never opens');
  await tap('.ov-card .top >> nth=0');
  await tap('.ov-card .top >> nth=1'); await at('Overview card');
  await tap('.tabbar .tab >> nth=1'); await at('Checklist tab');
  await tap('.tabbar .tab >> nth=2'); await at('More pop');
  await tap('.more-item >> nth=0'); await at('Roster');
  await p.goBack(); await p.waitForTimeout(200); await at('back');
  await tap('.tabbar .tab >> nth=2'); await tap('.more-item >> nth=1'); await at('History'); await p.goBack();
  await tap('.tabbar .tab >> nth=2'); await tap('.more-item >> nth=2'); await at('Settings');
  for (const name of ['Sync', 'Appearance', 'Subjects', 'Sharing', 'About', 'Dev options', 'Keyboard shortcuts']) {
    const row = p.locator('button', { hasText: name }).first();
    if (!(await row.count())) { ok(false, `Settings button ${name} missing`); continue; }
    await row.tap(); await at(name);
    if (name === 'Keyboard shortcuts') { await p.tap('.kb-sheet-scrim', { position: { x: 200, y: 20 } }); await p.waitForTimeout(250); } else { await p.goBack(); await p.waitForTimeout(250); }
    await at(`back from ${name}`);
  }
  // keyboard afterwards shows the ring
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  await tap('[data-cell="2-0"]'); await at('tick before keyboard');
  await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok(!!(await ring()), 'keydown (Tab) afterwards shows the ring');
  await tap('[data-cell="5-0"]'); await at('touch again hides it');
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
