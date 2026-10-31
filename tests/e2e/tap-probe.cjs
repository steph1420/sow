// P1-4 (v0.27.0): every control has a ≥44×44 hit area (elementFromPoint at ±21px around centre hits it).
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://localhost:4179/sow/';
const W = +(process.argv[3] || 412), H = W === 360 ? 780 : 915;
const R = 21;
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:W,height:H}, isMobile:true, hasTouch:true }); await p.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} }); /* v0.44.0: existing 2-date device */
  let fails = 0;
  const audit = async (screen, sel) => {
    await p.waitForTimeout(400);
    const bad = await p.evaluate(({ sel, R }) => {
      const out = [];
      const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && !(e.closest('.ov-filters') && (r.right > e.closest('.ov-filters').getBoundingClientRect().right - 28)) /* scrolled-off chips are reachable by scrolling */ && getComputedStyle(e).visibility !== 'hidden'; });
      const hit = (e,x,y) => { if (x<0||y<0||x>=innerWidth||y>=innerHeight) return false; const h = document.elementFromPoint(x,y); return !!h && (h===e || e.contains(h)); };
      for (const e of els) {
        const r = e.getBoundingClientRect(); const cx = r.left + r.width/2, cy = r.top + r.height/2;
        // measure contiguous hit span through the centre (pseudo-element hit slop counts)
        let l=0,rr=0,u=0,d=0;
        while (l<60 && hit(e,cx-l-1,cy)) l++; while (rr<60 && hit(e,cx+rr+1,cy)) rr++;
        while (u<60 && hit(e,cx,cy-u-1)) u++; while (d<60 && hit(e,cx,cy+d+1)) d++;
        const hw = l+rr+1, hh = u+d+1;
        if (hw < 44 || hh < 44) out.push(`${e.className || e.tagName}「${(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,18)}」 box ${Math.round(r.width)}×${Math.round(r.height)} hit ${hw}×${hh}`);
      }
      return out;
    }, { sel, R });
    console.log((bad.length ? 'FAIL ' : 'PASS ') + screen + (bad.length ? '\n   ' + bad.join('\n   ') : ''));
    fails += bad.length ? 1 : 0;
  };
  const CTRL = 'button:not(.scrim):not(.sw-copy-scrim), input, select, [role=button]';
  await p.goto(url, { waitUntil:'networkidle' }); await audit('Overview', CTRL);
  await p.goto(url+'#checklist/KGA_Eng_CW'); await p.reload({ waitUntil:'networkidle' }); await audit('Checklist', CTRL + ', .sw-tickall');
  await p.locator('.sw-kebab').click(); await audit('Checklist Tools sheet', '.sw-menu-row, .sw-menu-seg button');
  // v0.29.1: the whole Tools row (full width × ≥44px) is the hit area — the ±60px scan above caps width at 121.
  { const bad = await p.evaluate(() => [...document.querySelectorAll('.sw-menu-row')].flatMap((e) => { const r = e.getBoundingClientRect(); const out = []; const cy = r.top + r.height / 2;
      for (let x = Math.ceil(r.left) + 1; x < r.right - 1; x += 3) { const h = document.elementFromPoint(x, cy); if (!(h === e || e.contains(h))) { out.push(`${e.textContent.trim().slice(0,12)} dead at x=${x}`); break } }
      for (const y of [cy - 21.5, cy + 21.5]) { const h = document.elementFromPoint(r.left + r.width / 2, y); if (!(h === e || e.contains(h))) out.push(`${e.textContent.trim().slice(0,12)} short at y=${Math.round(y - r.top)}`) }
      return out }));
    console.log((bad.length ? 'FAIL ' : 'PASS ') + 'Tools rows full-width ≥44px hit' + (bad.length ? '\n   ' + bad.join('\n   ') : '')); fails += bad.length ? 1 : 0 }
  await p.goto(url); await p.reload({ waitUntil:'networkidle' }); await p.locator('.tabbar .tab').nth(2).click(); await audit('More popup', '.more-item');
  await p.goto(url+'#settings'); await p.reload({ waitUntil:'networkidle' }); await audit('Settings', CTRL);
  await p.goto(url+'#settings/sync'); await p.reload({ waitUntil:'networkidle' }); await audit('Sync', CTRL);
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails?1:0);
})();
