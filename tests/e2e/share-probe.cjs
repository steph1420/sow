// v0.28.0 Share (locked t164u) — REAL touch (CDP touch taps / long-press / drag), Android UA, 412×915.
// Overview Open·Share → chooser (templates, preview, prefix, Copy, WhatsApp) · Tools → Share ·
// Back closes sheet first · long-press pill → Settings → Sharing · CRUD + chips + drag reorder · legacy migration.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const { b, ctx, p } = await phone({ userAgent: UA, permissions: ['clipboard-read', 'clipboard-write'] });
  const cdp = await ctx.newCDPSession(p); p.setDefaultTimeout(5000);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const center = async (sel, i = 0) => { const bb = await p.locator(sel).nth(i).boundingBox(); if (!bb) throw new Error('no box ' + sel); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (sel, i = 0) => { await p.locator(sel).nth(i).scrollIntoViewIfNeeded(); const [x, y] = await center(sel, i); await touch('touchStart', x, y); await p.waitForTimeout(40); await touch('touchEnd'); await p.waitForTimeout(260); };
  const hold = async (sel, i = 0, ms = 700) => { const [x, y] = await center(sel, i); await touch('touchStart', x, y); await p.waitForTimeout(ms); await touch('touchEnd'); await p.waitForTimeout(350); };
  const back = async () => { await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(350); };
  const txt = (sel) => p.locator(sel).first().innerText().catch(() => null);
  const raw = (sel) => p.locator(sel).first().textContent().catch(() => null);
  const has = (sel) => p.$(sel).then(Boolean);
  await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return {}; }; });

  // legacy migration: v0.21 prefs with a customised template, no v0.28 prefs yet
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('sow.prefs.v1', JSON.stringify({ 'share.template': 'Legacy {class} {date} ({count})\n{names}', 'share.includeClassPrefix': false })); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);

  // 1 Overview: one-word Share on every card
  const cards = await p.locator('.ov-card').count();
  const shares = await p.locator('.ov-act .ov-act-share').count();
  ok(cards > 0 && shares === cards, `every Overview card has Share (${shares}/${cards})`);
  ok((await txt('.ov-act .ov-act-share')) === 'Share' && (await txt('.ov-act .ov-act-open')) === 'Open', 'action row reads "Open · Share" (one word each)');
  const bb = await p.locator('.ov-act-share').first().boundingBox();
  ok(bb && bb.height >= 44, `Share hit ≥44px tall (${bb && bb.height})`);
  const cardLine = await txt('.ov-card .line');
  const m = /(\d+)\/(\d+)/.exec(cardLine || ''); const notSet = m ? +m[2] - +m[1] : -1;

  // 2 chooser
  await tap('.ov-act-share', 0);
  ok(await has('.share-sheet'), 'Share opens bottom sheet');
  const ctxLine = await txt('.share-ctx');
  ok(/KGA Eng CW · \d+\/\d+/.test(ctxLine || ''), 'context line: ' + ctxLine);
  const pills = await p.$$eval('.share-pill:not(.add)', (els) => els.map((e) => e.textContent.trim()));
  ok(JSON.stringify(pills) === JSON.stringify(['Pending', 'Completed', 'Submitted', 'Not submitted']), 'seeded pills (no Parents note): ' + pills.join(', '));
  ok(!(await has('.share-pill.add')), 'v0.29: no ＋ New pill in sheet');
  ok((await txt('.share-pill.on')) === 'Pending', 'Pending preselected (default)');
  let pv = await txt('.share-pv');
  ok(pv && pv.startsWith(`Legacy Eng CW `) && pv.includes(`(${notSet})`), 'legacy template migrated into Pending, prefix off: ' + (pv || '').split('\n')[0]);
  ok((await raw('.share-count')) === `${notSet} names`, `count badge "${await raw('.share-count')}" = ${notSet} names`);
  ok(notSet <= 8 || /…\d+ more/.test(pv), 'long list truncated with “…N more”');
  ok(!(await has('.share-prefix')), 'v0.29: prefix toggle only in Settings');
  await tap('.share-pill', 1);
  pv = await txt('.share-pv');
  ok(/^Eng CW • \d+\/\d+ • set \(\d+\/\d+\):/.test(pv), 'Completed preview: ' + pv.split('\n')[0]);
  await tap('.share-copy');
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok(/^Eng CW • .* • set \(/.test(clip) && !clip.includes('more'), 'Copy → clipboard has full message (' + clip.split('\n').length + ' lines)');
  ok((await txt('.share-toast')) === 'Copied', 'toast “Copied”');
  ok(!(await has('.share-sheet')), 'sheet closes after Copy');

  // 3 last used + WhatsApp + prefix is per-share (Settings default off)
  await tap('.ov-act-share', 1);
  ok((await txt('.share-pill.on')) === 'Completed', 'last-used template preselected');
  const msg = await p.$eval('.share-sheet', (e) => e.dataset.message);
  await tap('.share-wa');
  const opened = await p.evaluate(() => window.__opened);
  ok(opened.length === 1 && opened[0].startsWith('https://wa.me/?text=') && decodeURIComponent(opened[0].split('text=')[1]) === msg, 'WhatsApp → wa.me/?text= full message');

  // 4 Back closes sheet first
  await tap('.ov-act-share', 0);
  await back();
  ok(!(await has('.share-sheet')) && !(await has('.exit-toast')) && (await has('.ov-card')), 'back closes sheet, stays on Overview');

  // 5 Checklist Tools → Share
  await tap('.ov-act-open', 0); await p.waitForTimeout(300);
  ok(await has('.sw-list-wrap'), 'Open → Checklist');
  await tap('.sw-tools-chip');
  ok((await txt('.sw-tools-row.share'))?.startsWith('Share'), 'Tools menu has one-word Share');
  await tap('.sw-tools-row.share');
  ok(!(await has('.sw-tools-sheet')) && (await has('.share-sheet')), 'Tools → Share closes Tools, opens chooser');
  ok((await txt('.share-ctx'))?.startsWith('KGA Eng CW'), 'chooser bound to current class');
  await back();
  ok(!(await has('.share-sheet')) && (await has('.sw-list-wrap')), 'back closes sheet, stays on Checklist');
  await back();
  ok(!(await has('.sw-list-wrap')) && (await has('.ov-card')), 'next back → Overview');

  // 6 long-press pill → Settings → Sharing editing that template
  await tap('.ov-act-share', 0);
  await hold('.share-pill', 2);
  ok((await txt('.more-heading')) === 'Sharing', 'long-press pill → Settings → Sharing');
  ok((await p.$eval('.shr-name', (e) => e.value)) === 'Submitted', 'editing the long-pressed template');
  ok(p.url().endsWith('#settings/sharing'), 'route #settings/sharing');
  const rows0 = await p.$$eval('.shr-row', (els) => els.map((e) => e.dataset.id));
  ok(rows0.length === 4, 'list has 4 templates');
  ok((await txt('.shr-row.default .shr-badge')) === 'Default' && (await p.$eval('.shr-row.default', (e) => e.dataset.id)) === 'pending', 'Pending carries Default badge');

  // 7 CRUD
  await tap('.shr-new');
  ok((await p.locator('.shr-row').count()) === 5 && (await p.$eval('.shr-name', (e) => e.value)).startsWith('New template'), '＋ New adds + selects “New template”');
  await p.locator('.shr-body').focus();
  await p.$eval('.shr-body', (e) => { e.setSelectionRange(e.value.length, e.value.length); });
  await tap('.shr-chip[data-token="{names.set}"]');
  ok((await p.$eval('.shr-body', (e) => e.value)).endsWith('{names.set}'), 'token chip inserts at caret');
  ok(((await txt('.shr-pv')) || '').length > 0, 'live preview renders');
  await p.locator('.shr-name').fill('Parents');
  await p.locator('.shr-name').blur(); await p.waitForTimeout(200);
  ok((await txt('.shr-row.editing .shr-title')) === 'Parents', 'rename');
  await tap('.shr-dup');
  ok((await p.locator('.shr-row').count()) === 6 && (await p.$eval('.shr-name', (e) => e.value)) === 'Parents 2', 'duplicate → “Parents 2”');
  await tap('.shr-del'); ok((await p.locator('.shr-row').count()) === 6, 'first Delete tap only arms');
  await tap('.shr-del'); ok((await p.locator('.shr-row').count()) === 5, 'second tap deletes');
  await p.locator('.shr-body').fill('{class} {bogus}');
  ok(await has('.shr-warn'), 'unknown token warning');
  // drag reorder (real touch on handle): row 3 → top
  const before = await p.$$eval('.shr-row', (els) => els.map((e) => e.dataset.id));
  const h = await center('.shr-handle', 2); const top = await center('.shr-handle', 0);
  await touch('touchStart', ...h);
  for (let i = 1; i <= 12; i++) { await touch('touchMove', h[0], h[1] + (top[1] - 20 - h[1]) * i / 12); await p.waitForTimeout(16); }
  await touch('touchEnd'); await p.waitForTimeout(350);
  const after = await p.$$eval('.shr-row', (els) => els.map((e) => e.dataset.id));
  ok(after[0] === before[2] && after.length === before.length, `drag reorder: ${before.slice(0, 3)} → ${after.slice(0, 3)}`);
  // set default
  await tap('.shr-row .shr-title', 2); await tap('.shr-default');
  ok((await p.$eval('.shr-row.default', (e) => e.dataset.id)) === after[2], 'Set default moves badge');
  // reload persists
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const persisted = await p.$$eval('.shr-row', (els) => els.map((e) => e.dataset.id));
  ok((await txt('.more-heading')) === 'Sharing' && JSON.stringify(persisted) === JSON.stringify(after), 'reload keeps Sharing screen + order');
  await back();
  ok((await txt('.more-heading')) === 'Settings', 'back → Settings');
  ok(await has('.g-row-like.sharing'), 'Settings lists Sharing');

  // 8 Copy fallback (no async clipboard)
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); window.__copied = null; document.addEventListener('copy', () => { window.__copied = String(document.getSelection() || document.activeElement?.value || ''); }); });
  await p2.goto(url, { waitUntil: 'networkidle' }); await p2.waitForTimeout(400);
  await p2.locator('.ov-act-share').first().tap(); await p2.waitForTimeout(250);
  await p2.locator('.share-copy').tap(); await p2.waitForTimeout(300);
  const fb = await p2.evaluate(() => ({ c: window.__copied, t: document.querySelector('.share-toast')?.textContent }));
  ok(fb.t === 'Copied' && fb.c && fb.c.length > 10, 'Copy fallback (execCommand) works without navigator.clipboard');

  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
