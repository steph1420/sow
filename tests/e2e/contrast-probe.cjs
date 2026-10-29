// P1-5 (v0.27.0): WCAG AA text contrast (4.5:1, 3:1 large) + 3:1 for glyph icons, Day + Night, all screens.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const SCREENS = ['', '#checklist/KGA_Eng_CW', '#roster', '#history', '#settings', '#settings/sync', '#settings/appearance', '#settings/subjects', '#settings/about'];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
  let fails = 0;
  for (const theme of ['day','night']) for (const s of [...SCREENS, 'MORE']) {
    await p.goto(url + (s === 'MORE' ? '' : s)); await p.reload({ waitUntil:'networkidle' });
    await p.evaluate(t => { if (t==='day') document.documentElement.setAttribute('data-theme','day'); else document.documentElement.removeAttribute('data-theme'); }, theme);
    if (s === 'MORE') await p.locator('.tabbar .tab').nth(2).click();
    await p.waitForTimeout(350);
    const bad = await p.evaluate(() => {
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0],v[1],v[2],v[3]===undefined?1:v[3]]; };
      const over = (fg, bg) => { const a = fg[3]; return [fg[0]*a+bg[0]*(1-a), fg[1]*a+bg[1]*(1-a), fg[2]*a+bg[2]*(1-a), 1]; };
      const lum = c => { const f = x => { x/=255; return x<=0.03928? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
      const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
      const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const bi = cs.backgroundImage; if (bi && bi !== 'none' && /gradient/.test(bi)) { const cols = bi.match(/rgba?\([^)]+\)/g) || []; if (cols.length) { stack.push(parse(cols[0])); if (parse(cols[0])[3] >= 1) break; } } const c = parse(cs.backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } } let bg = parse(getComputedStyle(document.body).backgroundColor); if (bg[3] < 1) bg = [255,255,255,1]; for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg); return bg; };
      const opacityOf = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
      const out = [];
      const disabled = el => !!el.closest('button:disabled, [aria-disabled=true]');
      for (const el of document.querySelectorAll('body *')) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        const isIco = el.matches('.g-ico, .hc-ico');
        if (el.closest('.sw-az-slot.dim')) continue; // inactive letters (no names) — WCAG 1.4.3 exempts inactive UI
        if (!own && !isIco) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || disabled(el)) continue;
        const o = opacityOf(el); if (o < 0.05) continue;
        const bg = bgOf(el);
        let fg = parse(cs.color);
        fg = [fg[0],fg[1],fg[2],fg[3]*o];
        const rr = ratio(over(fg, bg), bg);
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const need = isIco ? 3 : (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
        if (rr < need - 0.005) out.push(`${(el.className && el.className.baseVal === undefined ? el.className : el.tagName) || el.tagName}「${(el.textContent||'').trim().slice(0,16)}」 ${rr.toFixed(2)} < ${need}`);
      }
      return [...new Set(out)];
    });
    const name = `${theme} ${s || 'overview'}`;
    console.log((bad.length ? 'FAIL ' : 'PASS ') + name + (bad.length ? '\n   ' + bad.slice(0, 40).join('\n   ') : ''));
    if (bad.length) fails++;
  }
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
