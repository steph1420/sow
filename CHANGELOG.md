# Changelog

## [0.12.0] — 2026-10-28
### Added
- JB-R6 Settings + Dev: Appearance Night/Day bold + Day HC (`data-*` tokens); Developer options for Overview filter A/B/C, undo icons|iconsLabel, A–Z physics; central `sow.prefs.v1` load/save/export/import
### Changed
- Settings restructured into Sheet & sync · Appearance · Checklist · A–Z · Developer drill-in


## [0.11.0] — 2026-10-28
### Added
- JB-R5 Calendar: month grid with Cancel + Confirm from Checklist date ▾ / cal icon (no “Use xyz”); session-date dots; Confirm selects session date or retargets active slot via putSession (+ mark migrate)


## [0.10.0] — 2026-10-28
### Added
- JB-R4 Checklist chrome: set count under class; calendar icon under date; Topic trunc → toast + pencil edit + X; undo/redo icons (per-class stacks); Set|Submitted always on; search icon→expand; Myntra Sort|Filters FAB + bottom sheets; list clears FAB; thin A–Z idle
- `undo.chrome` pref hook (default icons; iconsLabel CSS ready for Dev in JB-R6)


## [0.9.0] — 2026-10-28
### Added
- JB-R3 Overview: flat class×date session cards with progress ring %, soft-shade `{All|KGA|KGB}|{dates}` filter row, in-place expand (Set/Submitted + Open Checklist + Share), topic truncates when long
- `overview.filterStyle` pref hook (default shade; underline / boldColor CSS ready for Dev in JB-R6)


## [0.8.0] — 2026-10-27
### Added
- JB-R2 shell IA: 3-tab bar Checklist · Overview · More (popup → Roster / History / Settings)
- `/checklist` route (Mark renamed); `/overview` stub for JB-R3; redirects `/` `/session` `/mark` → Checklist

## [0.7.1] — 2026-10-27
### Docs
- Redesign locks documented (JB-R1): `JOB_BUNDLES_REDESIGN.md`, `LOCKED_UI.md`, extended `SETTINGS_STG.md` — Steve locked-in build phase 2026-10-27
### Fixed
- Mark A–Z strip: pinned to viewport (full height, no list scroll), exit letter filter (tap same letter, ∗ All, or Clear chip)
### Added
- iOS Contacts–style A–Z scrubber: press-drag fisheye + center HUD; full A–Z with unused letters dimmed

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
