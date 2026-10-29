// Shared launcher for e2e probes (phone profile, 412x915, touch).
const { chromium } = require('playwright-core');
const launchOpts = { executablePath: '/usr/bin/google-chrome' };
async function phone(opts = {}) {
  const b = await chromium.launch(launchOpts);
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, ...opts });
  const p = await ctx.newPage();
  return { b, ctx, p };
}
// v0.32.0 (Q-FIX-4B): the workbook URL is blank by default, so sheet probes enter it like Steve does (Settings > Sync).
// The URL comes from SOW_SHEET_URL (never committed).
async function setSheet(p, url) {
  const sheet = process.env.SOW_SHEET_URL;
  if (!sheet) { console.error('SOW_SHEET_URL not set'); process.exit(3); }
  await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' });
  await p.fill('input[name=sow-sheet-url]', sheet);
  await p.getByRole('button', { name: 'Test sheet', exact: true }).click();
  await p.waitForFunction(() => document.querySelectorAll('.subj-pill').length > 1, null, { timeout: 30000 }).catch(() => {});
}
module.exports = { phone, chromium, launchOpts, setSheet };
