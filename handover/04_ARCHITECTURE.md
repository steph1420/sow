# Architecture

- **Stack:** React 19, Vite, TypeScript PWA (service worker, IndexedDB); Vitest; Playwright CDP real-touch + keyboard probes `tests/e2e/*.cjs`; Apps Script bridge `apps-script/Code.js` (+ tests).
- **src/:** checklist (grid, gestures, A–Z, demoRoster) · overview · more · screens · shell · nav · dates (Dates panel, DatePicker) · share · sync (engine, bridge, prefsSync, prefsRunner, defaultBridge, crdt pending specs) · prefs · theme (palettes, contrast) · pwa (install, update) · lib (a11yRuntime, keyboard, undoStack, undoLabel, haptics, quickSearch, appVersion) · components (Toast, CheckMark) · data (api, IDB) · demo.
- **Sync:** `sync/engine.ts` gviz pull + bridge push, per-target newer-wins on updatedAt (clock guard v0.36.1). Replacement plan: docs/CRDT_SYNC_PLAN.md (op log, lamport + version vectors).
- **Prefs sync:** `sync/prefsSync.ts`, hidden Prefs tab, `prefsPull/prefsPush`.
- **Sheet drag:** `installSheetDrag` in `lib/a11yRuntime.ts`: preventDefault on touchstart in top 64 px; close >30% or flick >0.5 px/ms, else spring.
- **Desktop scale (v0.40.2):** landscape ≥1000 px = desktop, full width, scale innerHeight/600 cap 2.4; tabs poll for updates every 5 min.
- **Toasts:** `components/Toast.tsx` swipe/tap dismiss; labels `lib/undoLabel.ts`.
- **DatePicker:** Year dropdown + Month/Date/Day dials (`dial`, `pickDate`); replaces date 2; Add session.
- **Bridge protocol:** POST JSON `{action, token, …}` to `/exec`: pull, push (ticks/left/sessions, LockService, newer-wins), prefsPull, prefsPush, pair start/claim (6 digits, 300 s, 5 tries). Token in Script Properties `SOW_TOKEN`; response carries `version`.
- **Commands:** `npm ci`; `npm test`; `npm run build` (tsc + vite + check-version); e2e: build, `npx vite preview --base /sow/`, `node tests/e2e/<probe>.cjs` (v041-probe, sheet-tap-probe, wide-fill-probe, keyboard-probe, topic-sync-probe uses a fake bridge).
- **Deploy/verify:** push master → Actions Pages; `gh run list -R steph1420/sow -L 1` green; live `index-*.js` hash changed; dogfood 412×915 + 1440×900, Night + Day.
