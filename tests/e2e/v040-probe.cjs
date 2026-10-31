// v0.40.0 (t83u/t84u): "Last:", header dates right → Date panel, two-row column header (no counts), tick-all footer, topic edit.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4317/sow/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const tapEl = async (sel) => { const r = await p.$eval(sel, (e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await p.waitForTimeout(80); await touch('touchStart', r[0], r[1]); await touch('touchEnd'); await p.waitForTimeout(300); };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const lines = await p.$$eval('.ov-card .line', (e) => e.map((x) => x.textContent.trim()));
  ok(lines.some((l) => /^Last: Wed 28/.test(l)) && !lines.some((l) => /^Latest/.test(l)), `Overview past card says "Last:" (${lines.find((l) => /Wed 28/.test(l))})`);
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  // header
  ok(!(await p.$('.sw-lean-topic')), 'lean header: topic removed');
  ok(!(await p.$('.date-pill')), 'date chip row absorbed into the panel');
  const hd = await p.$eval('.sw-lean-dates', (e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, right: innerWidth - r.right, h: r.height, w: r.width }; });
  ok(/28\/10.*2\/11/.test(hd.t), `header dates oldest→newest (${hd.t})`);
  ok(hd.right < 80 && hd.h >= 44, `dates sit right, ≥44 tall (right gap ${Math.round(hd.right)}, h ${Math.round(hd.h)})`);
  // column header: two rows, no counts
  const ch = await p.$$eval('.sw-colhead .sw-dh', (e) => e.map((x) => ({ d: x.querySelector('.sw-dh-date').textContent, t: x.querySelector('.sw-dh-topic').textContent, txt: x.textContent, dl: x.querySelector('.sw-dh-btn').getAttribute('aria-label'), tw: x.querySelector('.sw-dh-topic').scrollWidth > x.querySelector('.sw-dh-topic').clientWidth || true, rows: [...x.querySelector('.sw-dh-btn').children].map((c) => Math.round(c.getBoundingClientRect().top)) })));
  ok(ch.length === 2 && ch[0].d === '28/10' && ch[1].d === '2/11', `2 column headers, calendar order (${ch.map((c) => c.d)})`);
  ok(ch.every((c) => c.rows[1] > c.rows[0]), 'date above topic (two rows)');
  ok(ch.every((c) => !/\d+\/\d+\s*\d+\/\d+|of \d+|set/i.test(c.txt + c.dl.replace(/choose dates/, ''))), `no counts in header or its SR label (${ch[0].dl})`);
  ok(!(await p.$('.sw-colhead .sw-allbox')), 'header no longer a tick-all box');
  const ovl = await p.$$eval('.sw-dh-topic', (e) => e.map((x) => { const r = x.getBoundingClientRect(); return [r.left, r.right, getComputedStyle(x).textOverflow]; }));
  ok(ovl[0][1] <= ovl[1][0] + 0.5 && ovl.every((o) => o[2] === 'ellipsis'), 'topics truncate with ellipsis, no overlap at 412px');
  const n0 = await p.$$eval('[data-cell$="-0"][aria-checked="true"]', (e) => e.length);
  await tapEl('.sw-dh-topic >> nth=0');
  const toast = await p.$eval('.share-toast, [role=status]', (e) => e.textContent).catch(() => '');
  ok(toast.includes(ch[0].t.replace('…', '')) || toast.length > ch[0].t.length, `tapping topic shows full topic toast (${toast})`);
  ok((await p.$$eval('[data-cell$="-0"][aria-checked="true"]', (e) => e.length)) === n0, 'header tap does not tick');
  // footer
  const ft = await p.$$eval('.sw-tickall', (e) => e.map((x) => ({ t: x.textContent, w: x.getBoundingClientRect().width, h: x.getBoundingClientRect().height })));
  ok(ft.length === 2 && ft.every((f) => /^(Tick all|Untick all)$/.test(f.t)), `footer: one Tick all / Untick all per column (${ft.map((f) => f.t)})`);
  ok(ft.every((f) => f.w >= 44 && f.h >= 44), 'footer targets ≥44');
  await tapEl('.sw-tickall >> nth=0');
  const all = await p.$$eval('[data-cell$="-0"]', (e) => e.every((x) => x.getAttribute('aria-checked') === 'true'));
  ok(all && (await p.$eval('.sw-tickall', (e) => e.textContent)) === 'Untick all', 'Tick all ticks the column; button flips to Untick all');
  await tapEl('.sw-tickall >> nth=0');
  ok(await p.$$eval('[data-cell$="-0"]', (e) => e.every((x) => x.getAttribute('aria-checked') === 'false')), 'Untick all clears it');
  await tapEl('[aria-label="Undo"]'); await tapEl('[aria-label="Undo"]');
  // date panel — v0.41.0: the whole top area hides while scrolled down; scroll back up first
  await p.$eval('.sw-list-wrap, .sw-scroll', (e) => { e.scrollTop = 0 }); await p.waitForTimeout(400);
  await tapEl('.sw-lean-dates');
  ok(await p.isVisible('[role=dialog][aria-label="Dates and topics"]'), 'tapping header dates opens Date panel');
  // v0.42.0 Q-DATES-A: Date 1 / Date 2 cards, one topic box, "1 date only"
  await tapEl('.dp-slot >> nth=0'); await tapEl('.dp-one');
  ok((await p.$$eval('.sw-colhead .sw-dh', (e) => e.length)) === 1, '1 date view from panel');
  ok((await p.$eval('.sw-dh-date', (e) => e.textContent)) === '28/10', 'targeted Date 1 is the one shown');
  await tapEl('.dp-one');
  ok((await p.$$eval('.sw-colhead .sw-dh', (e) => e.length)) === 2, 'back to 2 dates');
  await tapEl('.dp-slot >> nth=0');
  await p.fill('.dp-topic', 'Demo topic edited in v040 probe');
  await tapEl('.dp-save-main');
  ok(await p.isVisible('.dp-saved'), 'topic saved note');
  await tapEl('.qo-close');
  ok(!(await p.isVisible('.dp-sheet')), 'Done closes in one tap');
  ok((await p.$eval('.sw-dh-topic', (e) => e.textContent)) === 'Demo topic edited in v040 probe', 'column header shows the edited topic');
  const pend = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('sow-app'); r.onsuccess = () => { try { const tx = r.result.transaction('settings'); const g = tx.objectStore('settings').get('app'); g.onsuccess = () => res(g.result?.topicEdits ?? null); } catch (e) { res(String(e)) } }; r.onerror = () => res(null); }));
  ok(pend && JSON.stringify(pend).includes('Demo topic edited'), `edit stored as pending topicEdits (${JSON.stringify(pend).slice(0, 80)})`);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  ok((await p.$eval('.sw-dh-topic', (e) => e.textContent)) === 'Demo topic edited in v040 probe', 'edit survives reload');
  // keyboard A / D
  await p.focus('[data-cell="0-1"]');
  await p.keyboard.press('KeyA'); await p.waitForTimeout(200);
  ok(await p.$$eval('[data-cell$="-1"]', (e) => e.every((x) => x.getAttribute('aria-checked') === 'true')), 'A ticks all in the focused column');
  await p.keyboard.press('KeyA'); await p.waitForTimeout(200);
  ok(await p.$$eval('[data-cell$="-1"]', (e) => e.every((x) => x.getAttribute('aria-checked') === 'false')), 'A again unticks all');
  await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  await p.focus('[data-cell="0-0"]'); await p.keyboard.press('KeyD'); await p.waitForTimeout(250);
  ok(await p.isVisible('.dp-sheet'), 'D opens Date panel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok(!(await p.isVisible('.dp-sheet')), 'Esc closes Date panel');
  await p.keyboard.press('Shift+Slash'); await p.waitForTimeout(250);
  const kb = await p.textContent('.kb-sheet').catch(() => '');
  ok(/Tick all \/ untick all/.test(kb) && /Dates panel/.test(kb), '? sheet lists A and D');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})();
