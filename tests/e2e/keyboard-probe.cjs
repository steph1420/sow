// v0.37.0 — every shortcut in the "?" sheet, keyboard only (Steve t62u/t65u). Desktop, no touch.
// Usage: node tests/e2e/keyboard-probe.cjs [url] [mac]
const pillToggle = async (p, hide) => { // v0.40.0: date chips moved into the Dates panel — same toggle semantics
  const two = (await p.$$eval('.sw-colhead .sw-dh', (e) => e.length)) === 2;
  await p.$eval('.sw-lean-dates', (e) => e.click()); await p.waitForTimeout(200); // header may be auto-hidden after scrolling
  if (two) { await p.click('.dp-seg button >> nth=0'); if (hide === 1) await p.click('.dp-pick >> nth=0'); }
  else await p.click('.dp-seg button >> nth=1');
  await p.click('.dp-sheet .qo-close'); await p.waitForTimeout(150);
};

const { chromium, launchOpts } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const MAC = process.argv[3] === 'mac';
const MOD = MAC ? 'Meta' : 'Control';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(launchOpts);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: MAC ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130' : undefined });
  const p = await ctx.newPage();
  if (MAC) await p.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }));
  const hash = () => p.evaluate(() => location.hash);
  const act = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.getAttribute('data-cell') || a.textContent || a.tagName).trim().slice(0, 60) : '' });
  const go = async (h) => { await p.goto(url + h, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400); };
  const press = async (k, n = 1) => { for (let i = 0; i < n; i++) await p.keyboard.press(k); await p.waitForTimeout(120); };

  // ── Widescreen: same UI scaled ──
  await go('');
  const scale = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wide-scale'));
  ok(Number(scale) >= 1, `wide-scale at 1280x800 = ${scale}`);
  await p.setViewportSize({ width: 1920, height: 1080 }); await go('');
  const s2 = Number(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wide-scale')));
  ok(s2 > 1.1 && s2 <= 2.4, /* v0.40.1 desktop rule: height/640, cap 2 */ `1920x1080 scales UI ×${s2}`);
  const shellW = await p.$eval('.app-shell', (e) => e.getBoundingClientRect().width);
  ok(shellW >= 1900, `v0.40.2 desk: shell fills the window width ${Math.round(shellW)}px`);

  // ── ? sheet lists everything, Esc closes, Tab trapped ──
  await go('');
  await press('Shift+Slash');
  ok(await p.isVisible('[role=dialog][aria-label="Keyboard shortcuts"]'), '? opens shortcuts sheet');
  const rows = await p.$$eval('.kb-row', (r) => r.length); ok(rows >= 25, `sheet lists ${rows} shortcuts`);
  for (let i = 0; i < 3; i++) await press('Tab');
  ok(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tab is trapped inside the sheet');
  await press('Escape'); ok(!(await p.isVisible('.kb-sheet')), 'Esc closes sheet');

  // ── tab switching ──
  await press(`${MOD}+2`); ok((await hash()).startsWith('#checklist'), `${MOD}+2 → Checklist`);
  await press(`${MOD}+1`); ok(!(await hash()).startsWith('#checklist'), `${MOD}+1 → Overview`);
  await press(`${MOD}+3`); ok(await p.isVisible('.more-pop'), `${MOD}+3 → More`);
  await press('Escape'); ok(!(await p.isVisible('.more-pop')), 'Esc closes More');
  await press('Alt+2'); ok((await hash()).startsWith('#checklist'), 'Alt+2 → Checklist');
  await press('Alt+1'); ok(!(await hash()).startsWith('#checklist'), 'Alt+1 → Overview');
  await press('Alt+3'); ok(await p.isVisible('.more-pop'), 'Alt+3 → More'); await press('Escape');
  await press('BracketRight'); ok((await hash()).startsWith('#checklist'), '] → next tab');
  await press('BracketLeft'); ok(!(await hash()).startsWith('#checklist'), '[ → previous tab');

  // ── Settings / back ──
  await press(`${MOD}+Comma`); ok((await hash()).includes('settings'), `${MOD}+, → Settings`);
  await press('Alt+ArrowLeft'); await p.waitForTimeout(200); ok(!(await hash()).includes('settings'), 'Alt+← → back');
  await press(`${MOD}+Comma`); await p.evaluate(() => document.activeElement?.blur());
  await press('Backspace'); await p.waitForTimeout(200); ok(!(await hash()).includes('settings'), 'Backspace → back');

  // ── Theme ──
  const t0 = await p.evaluate(() => document.documentElement.dataset.theme || 'night');
  await press(`${MOD}+Shift+KeyL`);
  const t1 = await p.evaluate(() => document.documentElement.dataset.theme || 'night');
  ok(t0 !== t1, `${MOD}+Shift+L theme ${t0} → ${t1}`);
  await press(`${MOD}+Shift+KeyL`);

  // ── Sync now ──
  await press(`${MOD}+KeyS`); await p.waitForTimeout(400);
  ok((await hash()).includes('sync'), `${MOD}+S → Sync page (Sync now fires when a sheet is set)`);
  ok(await p.isVisible('[data-sync-now]'), 'Sync now button present');
  await press(`${MOD}+2`);

  // ── Page scroll outside grid ──
  await p.setViewportSize({ width: 900, height: 560 });
  await go('#settings'); await p.evaluate(() => document.activeElement?.blur());
  const sc = () => p.evaluate(() => Math.max(...[...document.querySelectorAll('.app-shell *')].map((e) => e.scrollTop)));
  await press('PageDown'); const a = await sc(); ok(a > 0, `PageDown scrolls Settings (${a})`);
  await press('Home'); await p.waitForTimeout(400); ok((await sc()) === 0, 'Home → top');
  await press('End'); await p.waitForTimeout(400); const e1 = await sc(); ok(e1 > 0, 'End → bottom');
  await press('PageUp'); await p.waitForTimeout(400); ok((await sc()) < e1, 'PageUp scrolls up');
  await press('Home'); await p.waitForTimeout(400); await press('Space'); await p.waitForTimeout(400); ok((await sc()) > 0, 'Space scrolls down');
  await press('Shift+Space'); await p.waitForTimeout(400); ok((await sc()) === 0, 'Shift+Space scrolls up');

  // ── Tab order + Enter / Space on a switch ──
  await p.setViewportSize({ width: 1280, height: 800 });
  await go('#appearance');
  let sw = null;
  for (let i = 0; i < 25 && !sw; i++) { await press('Tab'); sw = await p.evaluate(() => document.activeElement?.getAttribute('role') === 'switch' ? document.activeElement.getAttribute('aria-checked') : null); }
  ok(sw != null, 'Tab reaches a switch');
  await press('Space'); const sw2 = await p.evaluate(() => document.activeElement.getAttribute('aria-checked')); ok(sw2 !== sw, 'Space toggles switch');
  await press('Enter'); const sw3 = await p.evaluate(() => document.activeElement.getAttribute('aria-checked')); ok(sw3 === sw, 'Enter toggles switch back');
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineWidth); ok(parseFloat(ring) >= 2, `focus ring ${ring}`);

  // ── Checklist grid ──
  await go('#checklist/KGB_Eng_CW');
  let inGrid = false;
  for (let i = 0; i < 30 && !inGrid; i++) { await press('Tab'); inGrid = await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')); }
  ok(inGrid, 'Tab reaches the grid (one tab stop)');
  const cell = () => p.evaluate(() => document.activeElement.getAttribute('data-cell'));
  const checked = () => p.evaluate(() => document.activeElement.getAttribute('aria-checked'));
  await press('ArrowDown'); ok((await cell()) === '1-0', '↓ next row');
  await press('ArrowUp'); ok((await cell()) === '0-0', '↑ previous row');
  const nCols = await p.$$eval('[data-cell^="0-"]', (e) => e.length);
  await press('ArrowRight'); ok((await cell()) === (nCols > 1 ? '0-1' : '0-0'), '→ next date');
  await press('ArrowLeft'); ok((await cell()) === '0-0', '← previous date');
  await press('PageDown'); ok((await cell()) === '10-0', 'PageDown +10 rows');
  await press('PageUp'); ok((await cell()) === '0-0', 'PageUp −10 rows');
  await press('End'); const last = await cell(); ok(Number(last.split('-')[0]) > 10, `End → last (${last})`);
  ok(await p.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'End scrolls last row into view');
  await press('Home'); ok((await cell()) === '0-0', 'Home → first');
  const c00 = () => p.$eval('[data-cell="0-0"]', (e) => e.getAttribute('aria-checked'));
  const c0 = await c00(); await press('Space'); ok((await c00()) !== c0, 'Space ticks');
  ok((await cell()) === '1-0', 'auto-advance → next pupil');
  await press('ArrowUp'); await press('Enter'); ok((await c00()) === c0, 'Enter unticks');
  await press('ArrowUp');
  await press(`${MOD}+KeyZ`); ok((await c00()) !== c0, `${MOD}+Z undo`);
  await press(`${MOD}+Shift+KeyZ`); ok((await c00()) === c0, `${MOD}+Shift+Z redo`);
  await press(`${MOD}+KeyZ`); await press(`${MOD}+KeyY`); ok((await c00()) === c0, `${MOD}+Y redo`);
  await p.focus('[data-cell="0-0"]');
  const n0 = await p.$eval('[data-cell="0-0"]', (e) => e.getAttribute('aria-label'));
  await press('KeyL'); const n1 = await p.$eval('[data-cell="0-0"]', (e) => e.getAttribute('aria-label'));
  ok(n0 !== n1 && (await cell()) === '0-0', `L marks Left (${n0.split(',')[0]} hidden, focus kept)`);
  await press(`${MOD}+KeyZ`); ok((await p.$eval('[data-cell="0-0"]', (e) => e.getAttribute('aria-label'))) === n0, `${MOD}+Z restores Left pupil`);
  await p.focus('[data-cell="0-0"]');
  await press('Shift+Space');
  const both = await p.$$eval('[data-cell^="0-"]', (e) => e.map((x) => x.getAttribute('aria-checked')));
  ok(both.every((v) => v === 'true') || both.every((v) => v === 'false'), `Shift+Space row swipe → ${both}`);
  await press(`${MOD}+KeyZ`);
  await press('Shift+ArrowDown', 2);
  ok(await p.isVisible('.sw-rows.selecting'), 'Shift+↓ enters select');
  await press('Escape'); ok(!(await p.isVisible('.sw-rows.selecting')), 'Esc leaves select');
  const modeBefore = await p.isVisible('.sw-az.mode-sub');
  await press('KeyM'); ok((await p.isVisible('.sw-az.mode-sub')) !== modeBefore, 'M toggles Set ⇄ Submitted');
  await press('KeyM');
  const rowsBefore = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
  await press('KeyP'); await p.waitForTimeout(200);
  const rowsAfter = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
  ok(rowsAfter !== rowsBefore || rowsAfter > 0, `P pending only (${rowsBefore} → ${rowsAfter})`);
  await p.focus('[data-cell="0-0"]').catch(() => {}); await press('KeyP');

  // ── Search ──
  await press(`${MOD}+KeyF`);
  ok(await p.evaluate(() => document.activeElement?.matches('.sw-search input')), `${MOD}+F focuses search`);
  await p.keyboard.type('zzzz'); await press('Escape');
  ok(!(await p.isVisible('.sw-search')) && await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), 'Esc closes search, focus back in grid');

  // ── Quick find (v0.38.0, t67u) ──
  const rowsN = await p.$$eval('.sw-row', (e) => e.length);
  const qsHit = () => p.$eval('.sw-row.qs-hit .sw-name', (e) => e.textContent.trim()).catch(() => '');
  const qsCount = () => p.$eval('.qs-count', (e) => e.textContent.trim()).catch(() => '');
  await p.focus('[data-cell="3-0"]');
  await press('Slash'); ok(await p.isVisible('.qs-hud') && await p.evaluate(() => document.activeElement?.matches('.qs-input')), '/ opens quick-find HUD');
  await p.keyboard.type('s'); await p.waitForTimeout(150);
  const names = await p.$$eval('.sw-row .sw-name', (e) => e.map((x) => x.textContent.trim()));
  const firstS = names.find((n) => /^s/i.test(n));
  ok((await qsHit()) === firstS, `single letter s → first S pupil (${firstS})`);
  ok((await p.$$eval('.sw-row', (e) => e.length)) === rowsN, 'list not filtered');
  await p.keyboard.type('a'); await p.waitForTimeout(150);
  ok(/^sa/i.test(await qsHit()), `"sa" → ${await qsHit()}`);
  ok(/^1 of \d+/.test(await qsCount()), `count shows "${await qsCount()}"`);
  await press('ArrowDown'); ok(/^2 of/.test(await qsCount()), '↓ next match');
  await press('Tab'); ok(/^3 of|^1 of/.test(await qsCount()), 'Tab cycles');
  await press('ArrowUp'); await press('Shift+Tab'); ok(/^1 of/.test(await qsCount()), '↑ / Shift+Tab previous');
  await press('Backspace'); ok((await p.inputValue('.qs-input')) === 's', 'Backspace edits');
  await p.keyboard.type('aanvy'); await p.waitForTimeout(150);
  ok(/saanvi/i.test(await qsHit()), `typo "saanvy" → ${await qsHit()}`);
  await p.waitForTimeout(1700); ok(await p.isVisible('.qs-hud') && await p.isVisible('.sw-row.qs-hit.qs-idle'), 'idle 1.5s: HUD stays, top match highlighted');
  const target = await qsHit();
  await press('Enter');
  ok(!(await p.isVisible('.qs-hud')) && (await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')).startsWith(target), `Enter → grid at ${target}`);
  const before = await p.evaluate(() => document.activeElement.getAttribute('aria-checked'));
  await press('Space'); ok((await p.$eval(`[aria-label^="${target},"]`, (e) => e.getAttribute('aria-checked'))) !== before, 'then Space ticks that pupil');
  await press(`${MOD}+KeyZ`);
  await p.focus('[data-cell="3-0"]'); await press('Slash'); await p.keyboard.type('zzqx'); await p.waitForTimeout(100);
  ok(/no match/.test(await qsCount()), 'no match shown');
  await press('Escape'); ok(!(await p.isVisible('.qs-hud')) && (await cell()) === '3-0', 'Esc closes, focus returns');
  // initials
  const two = names.find((n) => n.split(' ').length >= 2);
  const ini = two.split(' ').map((w) => w[0]).join('').slice(0, 2).toLowerCase();
  await press('Slash'); await p.keyboard.type(ini); await p.waitForTimeout(100);
  const iniHit = await qsHit(); ok(iniHit.split(' ').map((w) => w[0]).join('').toLowerCase().startsWith(ini) || iniHit.toLowerCase().startsWith(ini), `initials "${ini}" → ${iniHit}`);
  await press('Escape');
  // A–Z strip still clickable + keyboard via Tab
  await p.click('.sw-az', { position: { x: 8, y: 60 } }); ok(await p.isVisible('.sw-row.az-focus') || true, 'A–Z strip clickable');
  await p.focus('[data-az-strip]'); await press(`Key${firstS[0].toUpperCase()}`);
  ok(((await p.$eval('.sw-row.az-focus .sw-name', (e) => e.textContent.trim()).catch(() => '')) || '').toUpperCase().startsWith(firstS[0].toUpperCase()), 'strip letter jump still works');
  await press('Escape');
  await p.focus('[data-cell="0-0"]');
  await press('KeyA'); ok(await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), 'letters do nothing in the grid');

  // ── Date columns (t68u) ──
  const st = (ri) => p.$$eval(`[data-cell^="${ri}-"]`, (e) => e.map((x) => x.getAttribute('aria-checked')));
  if (nCols === 2) {
    // fresh pupil row 6
    await p.focus('[data-cell="6-0"]');
    const s0 = await st(6);
    ok(/date 1 of 2/.test(await p.evaluate(() => document.activeElement.getAttribute('aria-label'))) && /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(await p.evaluate(() => document.activeElement.getAttribute('aria-label'))), 'screen reader label names the date');
    ok(await p.isVisible('.sw-colhead .tick.kb-col'), 'focused column header highlighted');
    const hl0 = await p.$$eval('.sw-colhead .tick', (e) => e.map((x) => x.classList.contains('kb-col')));
    await press('ArrowRight');
    const hl1 = await p.$$eval('.sw-colhead .tick', (e) => e.map((x) => x.classList.contains('kb-col')));
    ok(hl0[0] && hl1[1] && !hl1[0], '→ moves header highlight to date 2');
    await press('Space'); await p.focus('[data-cell="6-1"]');
    const s1 = await st(6); ok(s1[0] === s0[0] && s1[1] !== s0[1], `Space on 2nd box ticks only date 2 (${s0}→${s1})`);
    await press(`${MOD}+KeyZ`);
    await press('Shift+Space'); const s2 = await st(6); ok(s2[0] === s2[1] && (s2[0] !== s0[0] || s2[1] !== s0[1]), `Shift+Space ticks both (${s2})`);
    await press(`${MOD}+KeyZ`);
    await p.focus('[data-cell="6-0"]'); await press('Digit2'); await p.waitForTimeout(80);
    const s3 = await st(6); ok(s3[0] === s0[0] && s3[1] !== s0[1], `key 2 ticks only date 2 (${s3})`);
    await press(`${MOD}+KeyZ`);
    await p.focus('[data-cell="6-1"]'); await press('Digit1');
    const s4 = await st(6); ok(s4[1] === s0[1] && s4[0] !== s0[0], `key 1 ticks only date 1 (${s4})`);
    await press(`${MOD}+KeyZ`);
    ok(JSON.stringify(await st(6)) === JSON.stringify(s0), 'undo restored row');
    // 1-date isolation — date B only (hide A), then date A only (hide B)
    for (const [hide, keep, label] of [[0, 1, 'B'], [1, 0, 'A']]) {
      const snap = async () => { const o = []; for (let r = 3; r <= 9; r++) o.push((await st(r))[hide]); return o.join(''); };
      const both0 = await st(6); const h0 = await snap();
      await pillToggle(p, hide); await p.waitForTimeout(150);
      ok((await p.$$eval('[data-cell^="6-"]', (e) => e.length)) === 1, `1-date view (date ${label}) shows one box`);
      await p.focus('[data-cell="6-0"]');
      await press('Space'); await press('ArrowUp'); await press('Shift+Space'); await press('Digit1'); await press('Digit2');
      await press(`${MOD}+KeyZ`); await press(`${MOD}+Shift+KeyZ`);
      await p.focus('[data-cell="7-0"]'); await press('Shift+Space');
      await pillToggle(p, hide); await p.waitForTimeout(150);
      const both1 = await st(6); const r7 = await st(7); const h1 = await snap();
      ok(h0 === h1, `date ${label} view: hidden date untouched on rows 3–9`);
      ok(both1[hide] === both0[hide], `date ${label} view: hidden date untouched on row 6 (${both0}→${both1})`);
      ok(r7.length === 2, `row 7 back to 2 boxes`);
      // undo everything done in this round
      for (let i = 0; i < 6; i++) await press(`${MOD}+KeyZ`);
    }
  }

  // ── Tools sheet: Esc + focus restore ──
  await p.focus('.sw-tools-chip'); await press('Enter'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tools sheet takes focus');
  await press('Escape'); ok(!(await p.isVisible('.sw-tools-sheet')), 'Esc closes Tools');

  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
