# Code triangulation — v0.32.0 (Q-FIX-4B), 2026-10-29 IST
- Root: workbook URL hardcoded in `src/data/seed.ts:21` (first-run seed) and `src/data/persistWorkspace.ts:95` (`seedDemoWorkspaceToIdb`, only called from `seedIfEmpty`).
- Fix: both seed `''`. Existing devices: settings already in IDB → untouched (seed runs only when `seededAt` missing).
- Tests first: `api.test.ts` seed expects `sheetUrl === ''` (failed, then passed). Sync unit tests now `putSettings` a test URL. e2e `setSheet()` in `_launch.cjs` types `SOW_SHEET_URL` into Settings > Sync.
- Trap: `docs/SHEET_MAPPING.md`, `docs/SYNC_SETUP.md` still name the workbook (public repo until the 3C split).
