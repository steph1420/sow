// Shared launcher for e2e probes (phone profile, 412x915, touch).
const { chromium } = require('playwright-core');
const launchOpts = { executablePath: '/usr/bin/google-chrome' };
async function phone(opts = {}) {
  const { fresh, ...rest } = opts;
  const b = await chromium.launch(launchOpts);
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, ...rest });
  // v0.44.0: new devices start on the 1-date view. Older probes were written for an existing 2-date device;
  // pass { fresh: true } to test a brand-new device.
  if (!fresh) await ctx.addInitScript(() => { try { if (localStorage.getItem('sow.dateCols') === null) localStorage.setItem('sow.dateCols', '2'); } catch {} });
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
// v0.44.5: sync probes run ONLY against the TEST copy, on the Beta channel (Beta never falls back to the LIVE bridge).
// Token comes from SOW_TEST_BRIDGE_TOKEN in the box env (never printed / committed).
const TEST_EXEC = 'https://script.google.com/macros/s/AKfycbxU01l41mPcriTlPOXsrvh3krmiWuRh97UM1McXO9vZoJPF07woCDF17gLvnwOoYXkAtA/exec';
const TEST_SHEET = 'https://docs.google.com/spreadsheets/d/1iIGXOzdW9NTqLxWnBwI6UkpwOKyihQxvrG8L1v6njYI/edit';
async function betaInit(ctx) { await ctx.addInitScript(([u]) => { try { localStorage.setItem('sow.channel', 'beta'); localStorage.setItem('sow.betaUrl', u); } catch {} }, [TEST_EXEC]); }
async function setTestCopy(p, url) {
  const tok = process.env.SOW_TEST_BRIDGE_TOKEN;
  if (!tok) { console.error('SOW_TEST_BRIDGE_TOKEN not set'); process.exit(3); }
  await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' });
  if ((await p.evaluate(() => localStorage.getItem('sow.channel'))) !== 'beta') { console.error('refusing: not on Beta channel'); process.exit(4); }
  await p.fill('input[name=sow-sheet-url]', TEST_SHEET);
  await p.fill('input[name=sow-bridge-token]', tok); await p.locator('input[name=sow-bridge-token]').blur();
  await p.getByRole('button', { name: 'Test sheet', exact: true }).click();
  await p.waitForFunction(() => document.querySelectorAll('.subj-pill').length > 1, null, { timeout: 30000 }).catch(() => {});
  await dismissNudge(p);
}
async function dismissNudge(p) { const n = p.getByRole('button', { name: 'Not now', exact: true }); if (await n.count()) await n.first().click().catch(() => {}); }
module.exports = { phone, chromium, launchOpts, setSheet, betaInit, dismissNudge, setTestCopy, TEST_EXEC, TEST_SHEET };
