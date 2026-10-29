// v0.40.0 (t83u): topic edits push as ops.sessions over a ROUTED FAKE bridge (never the live sheet).
// v0.40 bridge (sessionsApplied) clears pending edits; an old bridge keeps them + "Update bridge script" note.
const { phone } = require('./_launch.cjs');
const url = process.argv[2] || 'http://localhost:4317/sow/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const EXEC = 'https://script.google.com/macros/s/FAKE-probe/exec';
(async () => {
  const { b, ctx, p } = await phone();
  let newBridge = true; const pushes = [];
  await ctx.route('https://script.google.com/**', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    if (body.action === 'push') pushes.push(body);
    const state = { ok: true, schema: 1, subjects: [{ subjectKey: 'KGA_Eng_CW', classKey: 'KGA', subject: 'Eng', kind: 'CW', active: true }], roster: [{ classKey: 'KGA', roll: 1, name: 'Demo One', status: 'Active', updatedAt: '' }], sessions: [], ticks: [] };
    const extra = body.action === 'push' && newBridge ? { sessionsApplied: (body.sessions || []).length } : {};
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: newBridge ? '0.40.0' : '0.36.1', ...state, applied: 0, ignored: 0, rejected: [], state, ...extra }) });
  });
  await ctx.route('https://docs.google.com/**', (r) => r.abort()); // never reach a real sheet
  const settings = (patch) => p.evaluate((patch) => new Promise((res) => { const r = indexedDB.open('sow-app'); r.onsuccess = () => { const tx = r.result.transaction('settings', 'readwrite'); const st = tx.objectStore('settings'); const g = st.get('app'); g.onsuccess = () => { const cur = g.result || { id: 'app' }; if (patch) st.put({ ...cur, ...patch }); tx.oncomplete = () => res(cur); }; }; }), patch);
  const edit = { 'KGA_Eng_CW|2026-10-28': { topic: 'Demo topic probe', updatedAt: '2026-10-30T00:00:00.000Z' } };
  const run = async () => {
    await p.goto(url + '#settings/sync', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    await p.click('[data-sync-now]'); await p.waitForTimeout(1500);
    return (await settings(null));
  };
  await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => { indexedDB.deleteDatabase('sow-app'); localStorage.clear(); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await settings({ syncUrl: EXEC, bridgeToken: 'probe-token', sheetUrl: 'https://docs.google.com/spreadsheets/d/FAKEPROBE/edit', topicEdits: edit, discoveredTabs: [{ name: 'KGA Eng CW', classKey: 'KGA_Eng_CW', subject: 'Eng' }] });
  newBridge = false;
  let s = await run();
  ok(pushes.length === 1 && JSON.stringify(pushes[0].sessions) === JSON.stringify([{ subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Demo topic probe', updatedAt: '2026-10-30T00:00:00.000Z' }]), 'push carries ops.sessions');
  ok(s.topicEdits && s.topicEdits['KGA_Eng_CW|2026-10-28'], 'old bridge: edit stays pending');
  ok((s.syncNotes || []).some((n) => /Update bridge script/.test(n)), `old bridge: note says update bridge (${s.syncNotes})`);
  newBridge = true;
  s = await run();
  ok(pushes.length === 2 && pushes[1].sessions?.length === 1, 'retried on next sync');
  ok(s.topicEdits && Object.keys(s.topicEdits).length === 0, 'v0.40 bridge: sessionsApplied clears pending edits');
  ok(!(s.syncNotes || []).some((n) => /Update bridge/.test(n)), 'note gone');
  s = await run();
  ok(pushes.length === 2, 'nothing pending → no further push');
  console.log('RESULT', fails, 'fails'); await b.close(); process.exit(fails ? 1 : 0);
})();
