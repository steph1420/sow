// v0.31.1 tidy — every button / role=button on the main screens has a real accessible name (not just a glyph).
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, p } = await phone();
  let fails = 0;
  for (const r of ['', '#checklist/KGB_Eng_CW', '#more', '#settings', '#sync', '#dev', '#about', '#history', '#roster', '#subjects', '#appearance', '#settings/sharing']) {
    await p.goto(url + r, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    const bad = await p.$$eval('button, [role=button], [role=switch], [role=checkbox]', (els) => els.filter((e) => e.getClientRects().length).map((e) => {
      const lab = (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent) || e.textContent || '').trim();
      return /[A-Za-z]{2}/.test(lab) ? null : `${e.tagName}.${e.className} "${lab}"`;
    }).filter(Boolean));
    for (const x of bad) { console.log(`FAIL ${r || 'home'}: unnamed ${x}`); fails++; }
    if (!bad.length) console.log(`PASS ${r || 'home'}: all controls named`);
  }
  console.log(`RESULT ${fails} fails`); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
