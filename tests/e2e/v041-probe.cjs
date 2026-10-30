// v0.41.0 (t101u–t108u, mocks v2 + v4 LOCKED): ⋮ menu, header layout, stuck header, undo/redo toasts,
// toast dismiss, date dials (touch + keyboard), add session, contrast slider. Demo data only.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4317/sow/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, ctx, p } = await phone();
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }] });
  const ctr = (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const tapEl = async (sel) => { const [x, y] = await ctr(sel); await touch('touchStart', x, y); await touch('touchEnd'); await p.waitForTimeout(300); };
  const drag = async (x, y, dx, dy, steps = 8) => { await touch('touchStart', x, y); for (let i = 1; i <= steps; i++) { await touch('touchMove', x + (dx * i) / steps, y + (dy * i) / steps); await p.waitForTimeout(16); } await touch('touchEnd'); await p.waitForTimeout(400); };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);

  // ── header layout (A, B)
  ok(!(await p.$('.sw-tools-sheet')) && (await p.$$('.sw-lean-tools .sw-search-btn')).length === 0, 'Tools chip and search icon gone from the bar');
  const pos = await p.evaluate(() => { const r = (s) => document.querySelector(s)?.getBoundingClientRect(); return { u: r('[aria-label=Undo]'), rd: r('[aria-label=Redo]'), k: r('.sw-kebab'), d: r('.sw-lean-dates') }; });
  ok(pos.k && pos.k.right > 380 && pos.rd.right <= pos.k.left + 1 && pos.k.left - pos.rd.right < 16 && pos.u.right <= pos.rd.left + 1, 'undo, redo right-aligned just left of ⋮');
  ok(pos.d && pos.d.right > 360, 'dates chip stays on the right');
  ok(pos.k.width >= 44 && pos.k.height >= 36, '⋮ is a comfortable target');
  // ── ⋮ menu (B)
  await tapEl('.sw-kebab');
  ok(await p.isVisible('.sw-menu[role=menu]'), '⋮ opens the menu');
  ok((await p.getAttribute('.sw-kebab', 'aria-expanded')) === 'true', 'aria-expanded true');
  const items = await p.$$eval('.sw-menu [role=menuitem], .sw-menu [role=menuitemcheckbox], .sw-menu [role=menuitemradio]', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(/^Set/.test(items[0]) && /Submitted/.test(items[1]), `Set/Submitted switch at the top (${items.slice(0, 2)})`);
  const order = ['Find pupil', 'Filter by name', 'Pending only', 'Quick overview', 'Copy marks', 'Share'];
  ok(order.every((t, i) => items.findIndex((x) => x.startsWith(t)) > 1 && (i === 0 || items.findIndex((x) => x.startsWith(t)) > items.findIndex((x) => x.startsWith(order[i - 1])))), `menu order (${items.join(' | ')})`);
  ok((await p.$$('.sw-menu hr')).length === 2, 'two dividers group the menu');
  ok(!items.some((x) => /date/i.test(x) && !/Copy/.test(x)), 'no date controls inside the menu');
  await tapEl('.sw-menu [data-mode=submitted]');
  ok(await p.$eval('.sw-page', (e) => e.classList.contains('mode-sub')), 'Submitted from the menu switches mode');
  await tapEl('.sw-menu [data-mode=set]');
  await touch('touchStart', 20, 880).then(() => touch('touchEnd')).then(() => p.waitForTimeout(300)); ok(!(await p.isVisible('.sw-menu')), 'one tap outside closes the menu');
  await tapEl('.sw-kebab'); await tapEl('.sw-menu >> text=Quick overview'); ok(await p.isVisible('.qo-sheet'), 'menu › Quick overview opens it'); await tapEl('.qo-close');
  await tapEl('.sw-kebab'); await tapEl('.sw-menu >> text=Find pupil'); ok(await p.isVisible('.qs-hud'), 'menu › Find pupil opens quick find'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await tapEl('.sw-kebab'); await tapEl('.sw-menu >> text=Pending only'); await tapEl('.sw-kebab');
  ok((await p.getAttribute('.sw-menu [data-item=pending]', 'aria-checked')) === 'true', 'Pending only toggles (menuitemcheckbox)');
  await tapEl('.sw-menu [data-item=pending]'); ok(!(await p.isVisible('.sw-menu')), 'Pending only closes the menu');
  // keyboard on menu
  await p.focus('.sw-kebab'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.activeElement?.closest('.sw-menu') != null), 'Enter on ⋮ moves focus into the menu');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.isVisible('.sw-menu')) && await p.evaluate(() => document.activeElement?.classList.contains('sw-kebab')), 'Esc closes, focus back on ⋮');

  // ── stuck header (C, D)
  const listTop = await ctr('.sw-list-wrap');
  await drag(200, 700, 0, -400); await drag(200, 700, 0, -300);
  await p.waitForTimeout(400);
  const st = await p.evaluate(() => { const bar = document.querySelector('.sw-colhead-bar').getBoundingClientRect(); const lean = document.querySelector('.sw-lean').getBoundingClientRect(); const ch = document.querySelector('.sw-chrome'); const cs = getComputedStyle(ch); return { barTop: bar.top, leanH: lean.height, stuck: ch.classList.contains('stuck'), shadow: cs.boxShadow, bg: cs.backgroundColor }; });
  ok(st.stuck && st.leanH < 2 && st.barTop < 4, `scrolled: undo/redo/⋮ row hides too, header flush at top (top ${Math.round(st.barTop)}, lean ${Math.round(st.leanH)})`);
  ok(st.shadow !== 'none' && !/rgba\(0, 0, 0, 0\)$/.test(st.bg) && !/transparent/.test(st.bg), `stuck header opaque with soft shadow (${st.shadow.slice(0, 40)})`);
  await drag(200, 300, 0, 300); await p.waitForTimeout(400);
  ok(!(await p.$eval('.sw-chrome', (e) => e.classList.contains('stuck'))), 'scroll up brings the top area back');
  await p.evaluate(() => { document.querySelector('.sw-list-wrap').scrollTop = 0 }); await p.waitForTimeout(300);

  // ── undo / redo toasts (1)
  const cell = '[data-cell="0-0"]';
  const was = await p.getAttribute(cell, 'aria-checked');
  await tapEl(cell);
  await tapEl('[aria-label=Undo]');
  const t1 = await p.textContent('.toast').catch(() => '');
  ok(new RegExp(`^Undid ${was === 'true' ? 'untick' : 'tick'} · .+ · 28/10`).test(t1), `undo toast names action, pupil, date (${t1})`);
  ok((await p.getAttribute(cell, 'aria-checked')) === was, 'undo restored the cell');
  ok(await p.isVisible('.toast button:has-text("Redo")'), 'undo toast has Redo');
  await tapEl('.toast button:has-text("Redo")');
  ok((await p.getAttribute(cell, 'aria-checked')) !== was, 'toast Redo re-applies');
  const t2 = await p.textContent('.toast').catch(() => '');
  ok(/^Redid /.test(t2) && await p.isVisible('.toast button:has-text("Undo")'), `redo toast + Undo button (${t2})`);
  // dismiss: swipe sideways
  const [tx, ty] = await ctr('.toast');
  await drag(tx, ty, 160, 0, 6);
  ok(!(await p.isVisible('.toast')), 'toast swipes away sideways');
  // dismiss: tap
  await tapEl('[aria-label=Undo]'); await p.waitForTimeout(100);
  await tapEl('.toast-msg');
  ok(!(await p.isVisible('.toast')), 'tap on a toast dismisses it');
  // other toasts (topic toast) also swipe / tap
  await tapEl('.sw-dh-btn >> nth=0'); ok(await p.isVisible('.toast'), 'topic toast uses the same toast');
  await tapEl('.toast-msg'); ok(!(await p.isVisible('.toast')), 'topic toast tap-dismisses');

  // ── date dials (v4)
  await tapEl('.sw-lean-dates');
  ok(await p.isVisible('.dp-sheet .dp-year'), 'Dates panel has the Year dropdown');
  const order2 = await p.$$eval('.dp-dials [data-dial]', (e) => e.map((x) => x.dataset.dial));
  ok(order2.join() === 'month,date,day', `dial order Month · Date · Day (${order2})`);
  const yTop = await p.$eval('.dp-year', (e) => e.getBoundingClientRect().bottom); const dTop = await p.$eval('.dp-dials', (e) => e.getBoundingClientRect().top);
  ok(yTop <= dTop, 'Year sits above the dials');
  const val = (d) => p.$eval(`.dp-dials [data-dial=${d}]`, (e) => e.getAttribute('aria-valuetext'));
  ok((await val('date')) === '2' && (await val('month')) === 'Nov' && (await val('day')) === 'Mon', `starts on date 2 (Mon 2 Nov) (${await val('day')} ${await val('date')} ${await val('month')})`);
  ok((await p.getAttribute('.dp-dials [data-dial=day]', 'aria-readonly')) === 'true', 'Day dial is display-only');
  ok(await p.$eval('.dp-dials [data-dial=date] .c', (e) => !!e.querySelector('.dot')), 'session date is dotted');
  // touch: drag the Date dial up by 2 rows → 4 Nov, day follows
  const [dx, dy] = await ctr('.dp-dials [data-dial=date]');
  await drag(dx, dy, 0, -88, 10);
  ok((await val('date')) === '4' && (await val('day')) === 'Wed', `touch: Date dial turned 2 steps, Day auto → Wed (${await val('date')} ${await val('day')})`);
  ok(/no session/i.test(await p.textContent('.dp-pick-card')) && await p.isVisible('.dp-pick-card >> text=Add session'), 'non-session date offers Add session');
  // keyboard: Tab between dials, arrows turn, Enter picks
  await p.focus('.dp-dials [data-dial=month]');
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(100);
  ok((await val('month')) === 'Oct', `ArrowUp turns the focused Month dial (${await val('month')})`);
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => document.activeElement?.dataset.dial === 'date'), 'Tab moves to the Date dial (Day is skipped)');
  for (let i = 0; i < 24; i++) await p.keyboard.press('ArrowDown');
  ok((await val('date')) === '28' && (await val('day')) === 'Wed', `arrows reach 28 Oct, Day Wed (${await val('date')} ${await val('day')})`);
  ok(/session/i.test(await p.textContent('.dp-pick-card')) && !/no session/i.test(await p.textContent('.dp-pick-card')), 'session date card');
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(80); // 27 Oct (no session)
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(/no session/i.test(await p.textContent('.dp-pick-card')), 'Enter on a non-session date asks to Add session (does not invent one)');
  await p.fill('.dp-pick-card input', 'Demo added topic');
  await tapEl('.dp-pick-card >> text=Add session');
  await p.waitForTimeout(300);
  const heads = await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent));
  ok(heads.join() === '27/10,28/10', `picked date replaced date 2, calendar order kept (${heads})`);
  const pend = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('sow-app'); r.onsuccess = () => { const g = r.result.transaction('settings').objectStore('settings').get('app'); g.onsuccess = () => res(g.result?.topicEdits ?? {}); }; }));
  ok(JSON.stringify(pend).includes('KGB_Eng_CW|2026-10-27'), 'Add session stored as a pending session for the next Sync');
  // session date pick via button
  await tapEl('.sw-lean-dates');
  ok((await p.$$eval('.dp-dials [data-dial=date] .c .dot', (e) => e.length)) === 1, 'added session is now dotted');
  await tapEl('.dp-reset'); await p.waitForTimeout(300);
  ok((await p.$$eval('.sw-dh-date', (e) => e.map((x) => x.textContent))).join() === '28/10,2/11', 'Back to sheet dates restores 28/10 · 2/11');
  if (await p.isVisible('.dp-sheet')) await tapEl('.dp-sheet .qo-close');

  // ── contrast (2)
  await p.goto(url + '#settings/appearance', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  const accent0 = await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent'));
  ok(await p.isVisible('input[type=range][aria-label=Contrast]'), 'Contrast slider in Appearance');
  const sec = () => p.evaluate(() => { const e = document.createElement('span'); e.style.color = 'var(--text-sec)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; });
  const s0 = await sec();
  await p.$eval('input[type=range][aria-label=Contrast]', (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, '10'); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(200); const sHi = await sec();
  ok(sHi !== s0, `Stronger changes secondary text (${s0} → ${sHi})`);
  ok((await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent'))) === accent0, 'accent untouched');
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'day')); await p.waitForTimeout(200);
  const sDay = await sec();
  await p.evaluate(() => document.documentElement.removeAttribute('data-theme')); await p.waitForTimeout(100);
  ok(/color-mix/.test(await p.evaluate(() => document.body.style.getPropertyValue('--text-sec'))) && sDay !== sHi, 'same contrast applies in Day (re-derived from Day colours)');
  await p.$eval('input[type=range][aria-label=Contrast]', (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, '0'); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(200);
  ok((await sec()) === s0, 'Default restores');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})();
