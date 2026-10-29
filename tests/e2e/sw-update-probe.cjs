// v0.31.0 (Steve t4u "Stuck in 0.29.0") — old SW → new build. Usage: node sw-update-probe.cjs <url> <rebuildCmd>
// Opens the app (old build, SW controls), rebuilds dist with a new version, then backgrounds/foregrounds
// the page WITHOUT navigating (like an Android PWA resumed). Expect: auto reload onto the new version.
const { execSync } = require('child_process');
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4179/sow/';
(async () => {
  const { b, ctx, p } = await phone();
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const ver = () => p.evaluate(() => [...document.scripts].map((s) => s.src).join(' '));
  execSync('SOW_VERSION_OVERRIDE=9.9.1 npx vite build', { stdio: 'ignore' });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });
  ok(true, 'SW controls the page on first install (clientsClaim)');
  await p.goto(url + '#about', { waitUntil: 'networkidle' });
  ok((await p.content()).includes('9.9.1'), 'old build 9.9.1 running under its SW');
  const s1 = await ver();
  execSync('SOW_VERSION_OVERRIDE=9.9.2 npx vite build', { stdio: 'ignore' });
  let navs = 0; p.on('framenavigated', (f) => { if (f === p.mainFrame()) navs++; });
  // background → foreground, no navigation
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForFunction(() => document.body.innerHTML.includes('9.9.2'), null, { timeout: 20000 }).catch(() => {});
  const txt = await p.content();
  ok(txt.includes('9.9.2'), `after resume: page auto-reloaded onto 9.9.2 (navs ${navs}, scripts changed ${s1 !== (await ver())})`);
  console.log(`RESULT ${fails} fails`); await b.close();
  execSync('npm run build', { stdio: 'ignore' });
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); try { execSync('npm run build', { stdio: 'ignore' }); } catch {} process.exit(2); });
