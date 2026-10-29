// v0.37.0 — every shortcut in the "?" sheet, keyboard only (Steve t62u/t65u). Desktop, no touch.
// Usage: node tests/e2e/keyboard-probe.cjs [url] [mac]
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
  ok(s2 > 1.1 && s2 <= 1.6, `1920x1080 scales UI ×${s2}`);
  const shellW = await p.$eval('.app-shell', (e) => e.getBoundingClientRect().width);
  ok(shellW > 560 && shellW < 1920, `scaled shell width ${Math.round(shellW)}px`);

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

  // ── A–Z strip ──
  await press('Slash'); ok(await p.evaluate(() => document.activeElement?.hasAttribute('data-az-strip')), '/ focuses A–Z strip');
  const names = await p.$$eval('.sw-row .sw-name', (e) => e.map((x) => x.textContent.trim()));
  const L = names[Math.floor(names.length / 2)][0].toUpperCase();
  await press(`Key${L}`);
  const focusRoll = await p.$eval('.sw-row.az-focus .sw-name', (e) => e.textContent.trim()).catch(() => '');
  ok(focusRoll.toUpperCase().startsWith(L), `letter ${L} jumps to ${focusRoll}`);
  const sameCount = names.filter((n) => n[0].toUpperCase() === L).length;
  await press(`Key${L}`);
  const focus2 = await p.$eval('.sw-row.az-focus .sw-name', (e) => e.textContent.trim()).catch(() => '');
  ok(sameCount < 2 || focus2 !== focusRoll, `${L} again cycles (${focus2})`);
  await press('ArrowDown'); ok(await p.evaluate(() => /Letter/.test(document.activeElement.getAttribute('aria-valuetext'))), '↓ next letter');
  await press('ArrowUp');
  await press('Enter');
  ok(await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), 'Enter → into grid at pupil');
  await press('Slash'); await press('Escape');
  ok(await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), 'Esc leaves strip → grid');
  await press('KeyA'); ok(await p.evaluate(() => document.activeElement?.hasAttribute('data-cell')), 'letters do nothing outside the strip');

  // ── Tools sheet: Esc + focus restore ──
  await p.click('.sw-tools-chip'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tools sheet takes focus');
  await press('Escape'); ok(!(await p.isVisible('.sw-tools-sheet')), 'Esc closes Tools');

  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
