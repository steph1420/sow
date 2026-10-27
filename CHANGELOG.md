# Changelog

## [0.7.0] — 2026-10-27
### Added
- Sync A: pull Eng Current (F3/G3 + F4/G4) + tick columns → sessions/marks (`set` only)
- Eng block hash + `sheetSeenAt` / `lastSyncAt` per classKey in settings
- Merge: Eng `set` wins unless local `updatedAt` > last sync; `submitted` stays app-local
- Clear demo Left; locked Left only Ishita 19 / Riyaarth 31 (KGA) + Rudransh 33 (KGB)
### Changed
- Empty first-launch seed (no demo roster/session) — Sync pulls live Eng tabs
- Settings: warn when Sheet URL pasted into Sync Web App field (405)
- Sync without Apps Script runs full Eng pull path

## [0.6.2] — 2026-10-27
### Fixed
- Mark A–Z strip overlapped student rows; now an absolute right-edge overlay with list padding

## [0.6.1] — 2026-10-27
### Changed
- GitHub Pages base `/sow/`: Vite base, PWA start_url/scope/navigateFallback, Router basename

## [0.6.0] — 2026-10-27
### Added
- JB-7: Day theme token polish, PWA install prompt (Android) + iOS Add-to-Home hint, offline banner, Sync-offline guard, Mark→Session empty link, BUGS.md
### Changed
- Manifest maskable icon; theme-color follows Day/Night

## [0.5.1] — 2026-10-27
### Changed
- Prefer Google Sheets connector for SoW_* create/push; Apps Script demoted to optional fallback (`docs/SYNC_SETUP.md`)

## [0.5.0] — 2026-10-27
### Added
- JB-6: Sheet sync — gviz roster pull, SoW_* merge by updatedAt, offline dirty/queue, Apps Script bridge (`apps-script/SoWSync.gs`), Settings Test/Sync + syncUrl
- docs/SYNC_SETUP.md

## [JB-5] — 2026-10-27
### Docs
- Locked sheet mapping: `docs/SHEET_MAPPING.md` (roster tabs + SoW_Sessions / SoW_Marks / SoW_RosterMeta)

## [0.4.0] — 2026-10-27
### Added
- JB-4: Home class cards (pending), Session (≤2 dates), Roster (Left toggle), History (% set), Settings (Sheet URL UI-only, Hide left, Day theme)

## [0.3.0] — 2026-10-27
### Added
- JB-3: Mark screen — Tools panel (Set|Submitted), filters, date→single column, header check-all (skips Left), search + letter jump

## [0.2.0] — 2026-10-27
### Added
- JB-2: IndexedDB store (students, rosterMeta, sessions, marks, settings)
- Field names aligned with SHEET_MAPPING.md (`set`, `submitted`, `left`, `classKey`+`roll`)
- Seed: KGA/KGB CW/HW samples; Ishita, Riyaarth, Rudransh as Left
- Vitest CRUD coverage (toggle, setAll skips Left, settings)

## [0.1.0] — 2026-10-27
### Added
- JB-1: Vite + React + TypeScript PWA scaffold
- Night/Day CSS tokens (night default)
- Router shell: Home, Session, Mark, Roster, History, Settings stubs
- Bottom nav + theme toggle
