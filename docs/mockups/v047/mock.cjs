// v0.47 request mocks (t116u). Rendered against LIVE https://steph1420.github.io/sow/ (v0.46.1) with in-page overlays. Codenames only (ST-01…). Re-rendered for v0.47.0.
const { chromium } = require('playwright-core');
const U = 'https://steph1420.github.io/sow/';
const DEMO = Array.from({ length: 45 }, (_, i) => 'ST-' + String(i + 1).padStart(2, '0')); // codenames only (agent-common): students are never named
const CSS = `
.mock-tag{position:fixed;bottom:120px;right:8px;z-index:99999;background:#e11d48;color:#fff;font:700 11px/1 system-ui;padding:5px 9px;border-radius:999px;letter-spacing:.04em;pointer-events:none;box-shadow:0 2px 6px #0006}
.mock-cap{position:fixed;left:8px;right:8px;bottom:62px;z-index:99998;background:#111c;color:#fff;font:500 12px/1.35 system-ui;padding:7px 10px;border-radius:10px;pointer-events:none}
[data-theme=day] .mock-cap{background:#fffd;color:#111;box-shadow:0 1px 6px #0003}
/* 1 pending countdown */
.sw-row.mk-tick{position:relative;overflow:hidden}
.sw-row.mk-tick .sw-name{opacity:.45;text-decoration:line-through;text-decoration-thickness:1.5px}
.sw-row.mk-tick::after{content:"";position:absolute;left:0;bottom:0;height:3px;width:var(--mk-w,100%);background:var(--accent,#22c55e);opacity:.8;border-radius:0 2px 2px 0}
.sw-row.mk-collapse{max-height:22px!important;min-height:0!important;opacity:.25;transform:scaleY(.6);transform-origin:top;margin-top:-6px;margin-bottom:-6px}
.mk-undo-hint{position:absolute;right:120px;top:50%;transform:translateY(-50%);font:600 11px system-ui;opacity:.7}
/* 3 overlay top panel */
.mk-ov .sw-chrome{position:absolute!important;top:0;left:0;right:0;z-index:6;transition:none}
.mk-ov .sw-lean{background:var(--bg,#0b0d0c);display:block!important;height:auto!important;max-height:none!important;opacity:1!important;visibility:visible!important;transform:none!important;margin:0!important}
.mk-ov .sw-chrome{background:var(--bg,#0b0d0c)}
.mk-captop .mock-cap{bottom:auto;top:34px}
.mk-ov .sw-body{position:absolute!important;top:0;left:0;right:0;bottom:0;height:auto!important}
.mk-ov .sw-list-wrap{height:100%}
.mk-ov .sw-rows{padding-top:var(--mk-pad,175px)}
.mk-ov.mk-hidden .sw-chrome{transform:translateY(calc(-1 * var(--mk-lean,113px)))}
.mk-ov.mk-hidden .sw-colhead-bar{box-shadow:0 6px 14px -6px #0008}
.mk-finger{position:fixed;width:46px;height:46px;border-radius:50%;background:#fff4;border:2px solid #fff9;z-index:99997;pointer-events:none;box-shadow:0 0 0 6px #fff1}
[data-theme=day] .mk-finger{background:#0002;border-color:#0006}
.mk-arrow{position:fixed;z-index:99997;font:700 20px system-ui;color:#fffb;pointer-events:none}
[data-theme=day] .mk-arrow{color:#000a}
/* 2 share */
.mk-qo-actions{display:flex;gap:10px;margin-top:10px}
.mk-qo-actions button{flex:1}
.mk-share{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:12px;font:600 15px system-ui;border:1px solid var(--line,#2a2f2c);background:transparent;color:inherit}
.mk-share-ic{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line,#2a2f2c);margin-left:auto;font-size:16px}
.mk-hl{outline:2px dashed #e11d48;outline-offset:3px}
`;
async function setup(b, w, h, theme, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); });
  const p = await ctx.newPage();
  await p.goto(U + '#settings/appearance', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.getByRole('button', { name: theme === 'day' ? 'Day' : 'Night', exact: true }).click();
  await p.goto(U + '#checklist/KGA_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.addStyleTag({ content: CSS });
  return { ctx, p };
}
async function scrub(p) {
  await p.evaluate((D) => { document.querySelectorAll('.sw-row .sw-name:not(.sw-tickall-label)').forEach((e, i) => { const n = D[i % D.length]; if (e.firstChild && e.firstChild.nodeType === 3) e.firstChild.nodeValue = n; else e.textContent = n; }); }, DEMO);
}
async function shot(p, file, label, cap) {
  await scrub(p);
  await p.evaluate(([l, c]) => { document.querySelectorAll('.mock-tag,.mock-cap').forEach(e => e.remove()); const t = document.createElement('div'); t.className = 'mock-tag'; t.textContent = 'MOCK · ' + l; document.body.appendChild(t); if (c) { const k = document.createElement('div'); k.className = 'mock-cap'; k.textContent = c; document.body.appendChild(k); } }, [label, cap]);
  await p.waitForTimeout(150);
  await p.screenshot({ path: file });
  console.log('wrote', file);
}
const reset = (p) => p.evaluate(() => { document.querySelectorAll('.mk-tick,.mk-collapse').forEach(e => e.classList.remove('mk-tick', 'mk-collapse')); document.querySelectorAll('.mk-finger,.mk-arrow,.mk-undo-hint').forEach(e => e.remove()); document.documentElement.classList.remove('mk-ov', 'mk-hidden'); });

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  // collect seed names for the real-name check
  const sizes = [['phone', 412, 915, true], ['desktop', 1440, 900, false]];
  for (const theme of ['night', 'day']) for (const [sz, w, h, mob] of sizes) {
    const { ctx, p } = await setup(b, w, h, theme, mob);
    const base = `${__dirname}/${theme}-${sz}`;
    // ---------- 1 Pending countdown ----------
    await p.locator('.sw-kebab').click(); await p.waitForTimeout(300);
    await p.locator('[data-item=pending]').click(); await p.waitForTimeout(500);
    const idx = 2;
    const tickRow = async (pct, cls) => p.evaluate(([i, pct, cls]) => { const r = document.querySelectorAll('.sw-row')[i]; r.classList.add(...cls); r.style.setProperty('--mk-w', pct + '%'); const cs = r.querySelectorAll('.sw-check'); const c = cs[cs.length-1]; if (c) { c.classList.add('on'); c.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16"><path d="M3.2 8.4 L6.6 11.6 L12.8 4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'; } }, [idx, pct, cls]);
    await tickRow(100, ['mk-tick']);
    await shot(p, `${base}-1a-pending-just-ticked.png`, '1a just ticked', 'Pending only · tick: name stays, dims + strikes, 3 s bar starts full');
    await tickRow(45, ['mk-tick']);
    await shot(p, `${base}-1b-pending-mid-countdown.png`, '1b mid-countdown', 'Bar drains left → right… ~1.6 s left. Tap the row again to cancel.');
    await tickRow(0, ['mk-tick', 'mk-collapse']);
    await shot(p, `${base}-1c-pending-collapsing.png`, '1c collapsing', 'At 0: row fades + collapses (≈220 ms); rows below glide up');
    await reset(p);
    await p.evaluate((i) => { const r = document.querySelectorAll('.sw-row')[i]; const cs = r.querySelectorAll('.sw-check'); const c = cs[cs.length-1]; if (c) { c.classList.remove('on'); c.innerHTML = ''; } const toast = document.createElement('div'); toast.className = 'mock-cap'; }, idx);
    await shot(p, `${base}-1d-pending-cancelled.png`, '1d cancelled', 'Tapped again inside 3 s: tick undone, row stays, bar gone (no toast)');
    await p.locator('.sw-kebab').click(); await p.waitForTimeout(300);
    await p.locator('[data-item=pending]').click(); await p.waitForTimeout(500);
    // ---------- 2 Share in Quick overview ----------
    await p.evaluate(() => document.documentElement.classList.add('mk-captop')); await p.evaluate(() => window.dispatchEvent(new Event('sow:quick-overview'))); await p.waitForTimeout(700);
    await p.evaluate(() => { const close = document.querySelector('.qo-close'); const wrap = document.createElement('div'); wrap.className = 'mk-qo-actions'; const s = document.createElement('button'); s.type = 'button'; s.className = 'mk-share'; s.innerHTML = '<span aria-hidden>⤴</span> Share'; close.parentNode.insertBefore(wrap, close); wrap.appendChild(s); wrap.appendChild(close); close.style.flex = '1'; close.style.marginTop = '0'; });
    await shot(p, `${base}-2a-overview-share-rec.png`, '2a Share (rec)', 'REC: Share | Close as one footer row; same WA text as Overview › Share');
    await p.evaluate(() => { document.querySelector('.mk-qo-actions')?.replaceWith(document.querySelector('.qo-close')); const h = document.querySelector('.qo-head'); const s = document.createElement('span'); s.className = 'mk-share-ic mk-hl'; s.textContent = '⤴'; h.style.display = 'flex'; h.style.alignItems = 'center'; h.style.gap = '8px'; h.appendChild(s); });
    await shot(p, `${base}-2b-overview-share-alt.png`, '2b alt: icon in header', 'Alt: share icon top-right of the sheet (smaller, less obvious)');
    await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelector('.qo-scrim')?.click()); await p.waitForTimeout(500); await p.evaluate(() => document.documentElement.classList.remove('mk-captop'));
    // ---------- 3 Overlay top panel ----------
    const lean = await p.evaluate(() => { const c = document.querySelector('.sw-chrome').getBoundingClientRect().height; const l = document.querySelector('.sw-lean').getBoundingClientRect().height; document.documentElement.style.setProperty('--mk-pad', c + 'px'); document.documentElement.style.setProperty('--mk-lean', l + 'px'); document.documentElement.classList.add('mk-ov'); return l; });
    const sc = async (y) => { await p.evaluate((y) => { document.querySelector('.sw-list-wrap').scrollTop = y; }, y); await p.waitForTimeout(250); await p.evaluate(() => document.querySelector('.sw-chrome').classList.remove('stuck')); };
    await sc(0); await p.waitForTimeout(200);
    await shot(p, `${base}-3a-panel-over-table.png`, '3a panel over table', 'Top panel floats OVER the table; table starts under it at rest');
    await sc(260); await p.waitForTimeout(200);
    await p.evaluate(() => { const f = document.createElement('div'); f.className = 'mk-finger'; f.style.left = '45%'; f.style.top = '60%'; document.body.appendChild(f); const a = document.createElement('div'); a.className = 'mk-arrow'; a.textContent = '↑'; a.style.left = 'calc(45% + 14px)'; a.style.top = 'calc(60% - 34px)'; document.body.appendChild(a); });
    await shot(p, `${base}-3b-mid-drag.png`, '3b mid-drag', 'Finger down + moving: panel does NOT move; rows scroll under it');
    await p.evaluate(() => document.querySelectorAll('.mk-finger,.mk-arrow').forEach(e => e.remove()));
    await p.evaluate(() => document.documentElement.classList.add('mk-hidden'));
    await shot(p, `${base}-3c-settled-down-hidden.png`, '3c settled ↓ hidden', 'Finger up + momentum stopped → panel slides away; rows stay exactly where they were');
    await sc(150); await p.evaluate(() => document.documentElement.classList.remove('mk-hidden'));
    await shot(p, `${base}-3d-settled-up-shown.png`, '3d settled ↑ shown', 'Scrolled up, settled → panel slides back over the table; rows don\'t move');
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
