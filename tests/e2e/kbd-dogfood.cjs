// v0.37.0 dogfood (Steve t66u): realistic keyboard-only workflows, desktop 1920x1080 + phone width with keyboard.
// Counts keystrokes + time per task; flags focus loss, invisible focus, off-screen focus and slow keys.
const { chromium, launchOpts } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const PROFILES = [
  { name: 'desktop-1920x1080', viewport: { width: 1920, height: 1080 } },
  { name: 'phone-412x915+kbd', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 },
];
(async () => {
  const b = await chromium.launch(launchOpts);
  const out = [];
  for (const prof of PROFILES) {
    const ctx = await b.newContext({ viewport: prof.viewport, deviceScaleFactor: prof.deviceScaleFactor || 1 });
    const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
    await p.goto(url, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    let keys = 0, issues = [], slow = 0, maxMs = 0;
    const check = async (k) => {
      const r = await p.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return { lost: true };
        const cs = getComputedStyle(a), rc = a.getBoundingClientRect();
        return { lost: false, ring: parseFloat(cs.outlineWidth) >= 2 || cs.boxShadow !== 'none', vis: rc.bottom > 0 && rc.width > 0 && rc.bottom <= (document.querySelector('.tabbar')?.getBoundingClientRect().top ?? innerHeight) + 1, what: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 40) };
      });
      if (r.lost) issues.push(`focus lost after ${k}`);
      else { if (!r.vis) issues.push(`focus off-screen after ${k} (${r.what})`); if (!r.ring && r.focusVisible !== false) issues.push(`no ring after ${k} (${r.what})`); }
    };
    const press = async (k, n = 1, chk = true) => {
      for (let i = 0; i < n; i++) {
        const t = Date.now(); await p.keyboard.press(k);
        await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const ms = Date.now() - t; maxMs = Math.max(maxMs, ms); if (ms > 100) slow++;
        keys++; if (chk) await check(k);
      }
    };
    const type = async (s) => { for (const ch of s) await press(ch.length === 1 && /[a-z]/i.test(ch) ? `Key${ch.toUpperCase()}` : ch); };
    const task = async (name, fn) => {
      keys = 0; issues = []; slow = 0; maxMs = 0; const t = Date.now();
      let err = ''; try { await fn(); } catch (e) { err = String(e.message).split('\n')[0]; }
      out.push({ profile: prof.name, task: name, keys, ms: Date.now() - t, maxKeyMs: maxMs, slowKeys: slow, issues: [...new Set(issues)].slice(0, 12), err });
    };
    const mod = 'Control';

    await task('mark whole class (Set) fast', async () => {
      await press(`${mod}+2`, 1, false);
      for (let i = 0; i < 30; i++) { await press('Tab', 1, false); if (await p.evaluate(() => document.activeElement?.hasAttribute('data-cell'))) break; }
      const n = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
      for (let i = 0; i < n; i++) {
        const c = await p.evaluate(() => document.activeElement.getAttribute('aria-checked'));
        await press(c === 'true' ? 'ArrowDown' : 'Space');
      }
      const on = await p.$$eval('[data-cell$="-0"]', (e) => e.filter((x) => x.getAttribute('aria-checked') === 'true').length);
      if (on < n) throw new Error(`only ${on}/${n} ticked`);
    });
    await task('undo whole class (Ctrl+Z ×n)', async () => {
      const n = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
      for (let i = 0; i < n; i++) await press(`${mod}+KeyZ`);
    });
    await task('jump with / + letter, next S, tick that pupil', async () => {
      await press('Slash'); await press('KeyS'); await press('ArrowDown'); await press('Enter');
      const who = await p.evaluate(() => (document.activeElement?.getAttribute('aria-label') || '').split(',')[0]);
      await press('Space');
      if (!/^S/i.test(who)) throw new Error('jump missed: ' + who);
    });
    await task('mark a pupil Left, then undo', async () => {
      await press('ArrowUp'); const before = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
      await press('KeyL'); const mid = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
      await press(`${mod}+KeyZ`); const after = await p.$$eval('[data-cell$="-0"]', (e) => e.length);
      if (!(mid === before - 1 && after === before)) throw new Error(`rows ${before}→${mid}→${after}`);
    });
    await task('switch tabs (Ctrl+1/2, ], [) and subject', async () => {
      await press(`${mod}+1`); await press(`${mod}+2`); await press('BracketLeft'); await press('BracketRight');
      // subject/class: Ctrl+1 lands on first card · ↓ next card · Enter expand · Tab → Open · Enter
      await press(`${mod}+1`);
      const before = await p.evaluate(() => document.querySelector('.ov-card.exp .top')?.textContent || '');
      await press('ArrowDown'); await press('Enter'); await press('Tab'); await press('Enter');
      await p.waitForTimeout(200);
      const moved = (await p.evaluate(() => location.hash)).startsWith('#checklist') && !(await p.evaluate(() => location.hash)).includes('KGA_Eng_CW');
      issues.push('landed: ' + (await p.evaluate(() => location.hash)));
      if (!moved) throw new Error('no keyboard path to switch subject/class');
    });
    await task('Ctrl+, → change theme (Appearance)', async () => {
      await press(`${mod}+Comma`);
      const t0 = await p.evaluate(() => document.documentElement.dataset.theme);
      let found = false;
      for (let i = 0; i < 25 && !found; i++) { await press('Tab'); found = /Appearance/.test(await p.evaluate(() => document.activeElement?.textContent || '')); }
      if (!found) throw new Error('Appearance not reachable');
      await press('Enter');
      let changed = false;
      for (let i = 0; i < 20 && !changed; i++) {
        await press('Tab'); const lab = await p.evaluate(() => document.activeElement?.textContent || '');
        if (/^\s*(Day|Light)\b/i.test(lab) || /Day/.test(lab) && t0 !== 'day') { await press('Enter'); changed = (await p.evaluate(() => document.documentElement.dataset.theme)) !== t0; }
      }
      if (!changed) { await press(`${mod}+Shift+KeyL`); changed = (await p.evaluate(() => document.documentElement.dataset.theme)) !== t0; if (changed) issues.push('Appearance theme control not found by Tab; used Ctrl+Shift+L'); }
      if (!changed) throw new Error('theme unchanged');
      await press(`${mod}+Shift+KeyL`, 1, false);
    });
    await task('Sync now (Ctrl+S)', async () => {
      await press(`${mod}+KeyS`); await p.waitForTimeout(300);
      if (!(await p.evaluate(() => location.hash)).includes('sync')) throw new Error('not on Sync');
    });
    await task('quick find: 10 pupils by partial / typo names', async () => {
      await press(`${mod}+2`, 1, false); await p.goto(url + '#checklist/KGB_Eng_CW', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
      await p.focus('[data-cell="0-0"]');
      const Q = [['harsh', 'Harshita Rao'], ['kab se', 'Kabir Sethi'], ['krishnan', 'Veda Krishnan'], ['lakshay', 'Lakshya Gupta'], ['dp', 'Dhruv Patel'],
        ['nathn', 'Nathan Cruz'], ['malh', 'Ira Malhotra'], ['chtra', 'Chitra Menon'], ['elna', 'Elena Roy'], ['zoa', 'Zoya Khan']];
      const log = [];
      for (const [q, want] of Q) {
        const k0 = keys, t0 = Date.now();
        await press('Slash'); for (const ch of q) await press(ch === ' ' ? 'Space' : `Key${ch.toUpperCase()}`, 1, false);
        let hit = await p.$eval('.sw-row.qs-hit .sw-name', (e) => e.textContent.trim()).catch(() => '');
        const first = hit; let downs = 0;
        while (hit !== want && downs < 6) { await press('ArrowDown', 1, false); downs++; hit = await p.$eval('.sw-row.qs-hit .sw-name', (e) => e.textContent.trim()).catch(() => ''); }
        const count = await p.$eval('.qs-count', (e) => e.textContent.trim());
        await press('Enter');
        const landed = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
        log.push({ q, want, first, downs, count: count.replace(/·.*/, '').trim(), keys: keys - k0, ms: Date.now() - t0, ok: landed.startsWith(want) });
      }
      for (const l of log) issues.push(JSON.stringify(l));
      if (log.some((l) => !l.ok)) throw new Error('missed: ' + log.filter((l) => !l.ok).map((l) => l.q).join(','));
    });
    await task('mixed dates (10 pupils, alternate date1/date2) — arrows', async () => {
      await p.focus('[data-cell="10-0"]');
      for (let i = 0; i < 10; i++) { if (i % 2) { await press('ArrowRight'); await press('Space'); await press('ArrowLeft'); } else await press('Space'); }
      for (let i = 0; i < 10; i++) await press(`${mod}+KeyZ`, 1, false);
    });
    await task('mixed dates (10 pupils, alternate date1/date2) — keys 1/2', async () => {
      await p.focus('[data-cell="10-0"]');
      for (let i = 0; i < 10; i++) await press(i % 2 ? 'Digit2' : 'Digit1');
      for (let i = 0; i < 10; i++) await press(`${mod}+KeyZ`, 1, false);
    });
    await ctx.close();
  }
  await b.close();
  for (const r of out) console.log(JSON.stringify(r));
})().catch((e) => { console.error(e); process.exit(2); });
