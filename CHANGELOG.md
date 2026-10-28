# Changelog

## 0.24.0 — 2026-10-28 (Asia/Calcutta)

### Pretty plug — accordion · Sync now · Settings craft · multi-subject
- **Overview accordion**: kill Now-marking promote; flat Classes list; `expandedId` expands in place; one open; stable order; subject tags; Eng·Math filters; **no Share** stub.
- **Multi-subject**: demo Math sessions (`KGA_Math_CW`, `KGB_Math_HW`) + Eng; Sync/Settings copy says subject tabs (not Eng-only).
- **Sync**: primary soft-green **Sync now** (pull selected · push iff bridge + dirty · else Quiet saved-on-device); ghosts Test sheet · Pull only; this-run subject chips; `+ tab` → Subjects.
- **Settings craft**: ColorOS-soft hero tiles (Sync · Appearance · Subjects & sheets) + Classroom/System rows; Appearance Night/Day phones + FAB · A–Z · Reduce motion; **no** Soft-green toggle · **no** Marking-defaults dup.
- **Subjects & sheets**: honest catalog stub (Sci = not on sheet yet).
- Coding triangulation: `/workspace/sow-mockups/CODE_TRIANGULATION_v024.md` · plans locked + plugged.
- Live: https://steph1420.github.io/sow/
- Rollback: git tag `v0.23.0` / `eec0375`


## 0.23.0 — 2026-10-28 (Asia/Calcutta)

### Portal IA — Overview entry · lean Checklist
- **Default landing = Overview** (Home / entry portal); tab order Overview · Checklist · More.
- Checklist chrome collapsed to lean panel: **class · topic · set-count** + micro tools (date pills · undo/redo · Tools ▾ · search).
- Fat dual date-card stack, modebar, Pending/Copy bands leave Checklist → Overview / **Tools sheet**.
- Class tap on lean panel returns to Overview. Wave A gestures, A–Z 42, tick C, soft-green, More popup unchanged.
- Remocks locked: `portal-mj1…mj3` · plan `PORTAL_IA_PLAN.md` (Steve t141u).
- Live: https://steph1420.github.io/sow/

## 0.22.0 — 2026-10-28 (Asia/Calcutta)

### Whole-app Lucid Quiet rewrite cutover (Phase F)
- Replaces MarkPage / `ck-*` hybrid with ground-up `/workspace/sow-app` rewrite (Phases A–E).
- Checklist Wave A (hold-paint, select, A–Z 42, pills), Overview Lucid cards, More popup, Settings/Dev, IDB persist + Sync screen.
- Visual north star: Lucid Quiet remocks (`lucid-mj*`); More = popup (Steve t137u).
- Rollback: git tag `v0.21.0` / `v0.21.0-pre-rewrite` (last pre-rewrite Pages dogfood).
- Eng push still needs Apps Script syncUrl for round-trip; pull works when Sheet is link-readable.
- Live: https://steph1420.github.io/sow/

## [0.21.0] — 2026-10-28
### Added
- Checklist rebuild Phase 2 on `ck-*`: hold-paint (mostly-horizontal), name-hold select (~800ms), roll-drag, Actions copy/clear, undo — when Dev `chrome.useRebuild`
- Design psychology: Perceived freedom & control (Steve t126u)
### Notes
- Dogfood: Settings → Dev → Use rebuild on /checklist. Production MarkPage still default off-toggle. Tests 60/60.

## [0.20.0] — 2026-10-28
### Added
- Ground-up Checklist chrome (`src/pages/checklist/*`, `ck-*` CSS) beside MarkPage
- Dogfood route **`/checklist-next`**; Dev **Use rebuild on /checklist** (`chrome.useRebuild`, default off)
- Pref **`chrome.showFab`** default **false** (FAB optional)
- A–Z idle width default **42** (anti-squish letter floor); Autofill-safe search (`type=search`, `autoComplete=off`)
### Notes
- Production **`/checklist`** still MarkPage until Dev toggle. Phase 0–1 chrome only — marking/Wave A paint land in Phase 2+. Tests 60/60. Ingenuity = craft in hand, not flash.


## [0.19.0] — 2026-10-28
### Added
- Date **pills** (day numbers) replace “1 date” chip — both on = 2-col; one on = 1-col; force ≥1 on
- Check mark **C**: plain geometric ~2px stroke SVG ✓ on row checks + tick-all (empty = outline only)
### Changed
- Col-h is **✓-only** — no day · count · ✓ pack
- Date cards: drop “focused” / “· focused” / “· active” wording — accent border/fill only
- A–Z default idleWidth **35**; full alphabet with missing letters **dim**
- Auto-migrate sticky `az.idleWidth` < 34 → 35 on load; one-shot `az.hideEmpty` on → off (Dev can re-enable)
### Notes
- Wave A tools kept (hold-paint, Copy, undo, A–Z scroll-to, search snap, cal swipe, forgiving hits). Quiet type unchanged.

## [0.18.0] — 2026-10-28
### Added
- Date cards packed: left Date n + day · right subdued topic + `n/N set`
- **1 date** filter (chip + Filters sheet) — not a view toggle; tap dim card swaps focus
- Date-card strip slides when >2 dates (max 2 ✓ cols / focused cards)
- Calendar: **swipe left/right** on sheet changes month (day tap + Cancel/Confirm unchanged)
- Search: open snaps search bar to top of scroll; names filter live as you type
- A–Z: mid-viewport latch + subtle first-letter row highlight; HUD just left of ✓ cols
- Dev **A–Z on left** (strip on left edge; right remains default)
### Changed
- A–Z idle ~28px / ~9pt; vertical span = 1st name row → just above Sort/Filters
- A–Z scrub scroll is instant/urgent (~2× feel vs smooth finger fling)
- Chrome: Copy just left of search; undo/redo beside Set|Submitted; **1|2 view toggle removed**
- Hold-paint: **no hold ms** — locks on mostly-horizontal drag; vertical pan scrolls through ✓ cols
- Whole checklist (incl. ✓ + name–✓ gap) accepts vertical pan-y scroll
### Notes
- Manifest stays `standalone`. Wave A select 800ms / 0=none unchanged. Quiet type tokens kept.

## [0.17.0] — 2026-10-28
### Added
- Checklist two-date **2-col** default when `date2` exists · **1|2** column toggle
- Easy date chip pair (date1/date2 topics + counts)
- **Copy…** chip only when 2 dates — opens Actions (copy date1↔date2 / clear)
- Hold-paint **~180ms**: hold either ✓, drag horizontal to opposite ✓ (either direction); no free diagonal
- Select mode: **800ms hold on name**; roll# drag-to-select; ✕ exit; Actions FAB → sheet
- Actions sheet **does not dismiss on tap-outside** (✕ / action only); **0 selected = none** (actions disabled)
### Changed
- A–Z is **scroll-to only** (list never letter-filters); quiet letter HUD; strip styled as vertical **pill**
- Quiet type/spacing on Checklist: name 15/550, roll tertiary, muted labels, hairline rows ~48px, softer FAB, wider gutters
- **Forgiving touch hit areas (all platforms)** — visual chrome stays compact; recognition/hit boxes grow: ✓ ~36 visual / ~48 hit, name & hold-paint finger slop, wider roll column, taller A–Z letter bands, ≥44px chips/FAB/Actions
### Notes
- Wave A + Quiet type blueprint plugged from sow-mockups locks; letter-filter not restored (optional Dev later)

## [0.16.1] — 2026-10-28
### Fixed
- A–Z strip no longer spaces letters apart while scrolling Checklist (`--az-top` is scroll-compensated)
- Shift left (`az.insetRight`) easier to find: clearer Dev label + Checklist → Developer link
### Notes
- Future Settings redesigns: pull full Android/iOS Settings menu references first (see BUGS.md)


## [0.16.0] — 2026-10-28
### Fixed
- Dev NumRow: local string draft; commit/clamp on blur & Enter (no more stepper-only glitch)
- A–Z strip top pinned below Checklist `.head` (no overlap of class/date/topic chrome)
- Checklist feels less squeezed: wider name rows, thinner idle A–Z gutter, reduced main/list side padding; press-widen overlays + dims list
### Added
- Dev `az.insetRight` (Shift left) — px inset of A–Z strip from right
- WA share detailed placeholders: `{names.set|notSet|submitted|notSubmitted|active|left}` + `{count.*}`; `{set}`/`{notSet}` aliases; `{names}`/`{count}` stay not-set
### Changed
- Removed AppShell top bar + Day/Night header toggle (theme only in Settings → Appearance); version in Settings footer
- Settings IA: root nav rows → Sheet & sync · Checklist · Share · Appearance · Developer; iOS/Android back bar on drill-ins
- Removed explicit Letter filter chip / sheet row / `filter.showLetter` / `filter.default=letter` (letter via A–Z only)
- Removed calendar icon under date — open calendar from date ▾ only
## [0.15.0] — 2026-10-28
### Added
- JB-R9 Themes: Day/Night + Night bold / Day bold / Day HC wired across Checklist · Overview · Roster · History · Settings · sheets/FAB; `theme-color` + apple status bar follow `--theme-meta` (incl. Day HC); `color-scheme` on html
### Changed
- Pinned bottom tab bar (app height/overflow + body `overflow: hidden`) so nav never scrolls away
- Dev `az.idleWidth` (default 22) for thin A–Z idle thickness
### Notes
- Bundles R7 Roster+History · R8 WA share · R9 themes completed locally (v0.13–0.15)

## [0.14.0] — 2026-10-28
### Added
- JB-R8 WA share: locked template `{class} • {date} • not set/found ({count}):` + `{names}`; Overview Share builds not-set pending list; Settings → Share template editor (variable chips, preview, Copy / WhatsApp); prefs `share.template` + `share.includeClassPrefix`

## [0.13.0] — 2026-10-28
### Added
- JB-R7 Roster + History: grade chips + search on Roster; Left badges + Active/Left toggle; History All|KGA|KGB|CW|HW filters with class·date cards (% / set·submitted / topic) opening Checklist
### Changed
- Roster/History back → More (no Home/Session wording); quiet chrome matching `full-roster` / `full-history`

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