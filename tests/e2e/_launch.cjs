// Shared launcher for e2e probes (phone profile, 412x915, touch).
const { chromium } = require('playwright-core');
const launchOpts = { executablePath: '/usr/bin/google-chrome' };
async function phone(opts = {}) {
  const b = await chromium.launch(launchOpts);
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, ...opts });
  const p = await ctx.newPage();
  return { b, ctx, p };
}
module.exports = { phone, chromium, launchOpts };
