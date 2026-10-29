# Changelog

## 0.28.0 — 2026-10-29 (Asia/Calcutta)

Share is back as named templates, built to the locked mocks share-mj1..mj5 (Steve t164u "Beautiful"). Rollback: tag `v0.27.0` / `45778d3`.

### Share (t162u/t164u)
- **One word, two places.** Every Overview card has a quiet `Open · Share` row (the big "Open Checklist" button became `Open`). Checklist Tools has `Share ›` for the current class and the date on screen.
- **Chooser sheet.** Shows the context (class · date · topic), template pills with the last used one preselected (then the default), `＋ New`, a live preview truncated to "…N more" with a names count, a KGA/KGB prefix toggle for this share only, **Copy** (proper icon; Clipboard API with a textarea fallback; "Copied" toast) and **WhatsApp** (`wa.me/?text=`). Long-press a pill to edit it. A warning appears over 1500 encoded chars, and an empty template disables both targets.
- **Seeded templates:** Pending (default, the exact old `{class} • {date} • not set/found ({count}):\n{names}`), Completed, Submitted, Not submitted.
- **Settings → Sharing** (`#settings/sharing`): drag-to-reorder by handle (touch), Default badge, Rename / Duplicate / Default / Delete (two-tap; the last template can't be deleted), a token editor with green highlights (unknown tokens shown amber and wavy), chips that insert at the caret (`{count.*}` expands), a live preview on the real latest session, the default prefix, and Restore default templates. Names are unique and capped at 24 chars.
- **Migration:** if a customised legacy `share.template` exists in `sow.prefs.v1`, it becomes Pending's text, the prefix setting carries over, and the old key is dropped. This runs once.
- **Back** closes the sheet first, and Day and Night both use tokens.

### Checklist
- **A–Z strip:** the top • is gone (t166u). The strip no longer filters, so there's nothing to reset, and names that don't start with a letter sit under A.
- **Dev → "Swipe ticks one row only"** (t167u, default OFF): when it's on, a horizontal swipe ticks only the row it started on, even if the finger drifts down. Long-press select and roll-drag aren't affected.

- **Blue pending highlight** (t168u): while you hold a swipe or roll-drag, every covered row's ✓ boxes and the row ring turn blue, which is distinct from Set green and Submitted purple and tuned for Day and Night. The blue clears the moment you release and the ticks commit. This respects the one-row option.
- **Haptics** (t169u): a central `haptic()` helper with a Settings → Appearance → Haptics toggle (default ON). The A–Z strip gives an 8ms tick per letter change; tapping a tick gives 10ms; swipe commit gives 15ms. iOS stays silent. The full candidate plan is in `HAPTICS_PLAN.md`.

### Tests
- Unit 80 (share core 19, prefs/migration, route, A–Z). New real-touch e2e: `share-probe` (49 checks), `swipe-single-probe` (incl. blue pending hold/release), `haptics-probe`. Seam, back, az-tween and the v0.27 probe set re-run.

## 0.27.0 — 2026-10-29 (Asia/Calcutta)

Systematic fix pass on the v0.26.3 dogfood (Steve t163u "B") + real-phone gesture regression (t165u). Share restore is not in this release (mocked separately). Rollback: tag `v0.26.3` / `f289eb8`.

### Gestures on ✓ columns (t165u, real Android Brave) — top priority
- Vertical drag on the ✓ columns now scrolls the list (was blocked by `touch-action: none`); the roll column scrolls too except while selecting.
- Horizontal swipe on a row ticks **both** dates on release (fully ticked row → clears both); horizontal-then-vertical drag covers more rows and ticks them all on release, one undo step, light haptic.
- No stuck rings on release or cancel. Verified with real CDP touch events (Android UA): `tests/e2e/touch-gesture-probe.cjs` (also covers tap, long-press select, roll-drag select, Mark/Clear).

### P0
- **First Sync: sheet wins.** The first pull for a class drops every demo mark, including the phantom "Submitted" ones; later pulls still keep your Submitted marks.

### P1
- **Reload keeps your screen.** Hash routes (`#checklist/KGB_Eng_HW`, `#settings/sync`, …) work with Back and the exit toast.
- **Offline Sync.** Keeps the last tabs and chips, shows "You're offline", and disables Sync now, Test sheet and Pull only. Nothing is written, so the dirty flag doesn't change.
- **Tick-all partial** shows a dash (aria "mixed"); all ticked shows ✓.
- **≥44px tap areas** on chips, undo/redo, search, tick-all, Back, Sync pills/inputs/buttons. Visual sizes are unchanged, except the column header, which is 10px taller.
- **AA contrast** (4.5:1) for faint text in both themes, plus Day semantic colours, eyebrow tags and Settings icon tiles.

### P2
- History: honest copy after Sync ("From your sheet · synced …") and one row per pulled date.
- Overview date chips: "Wed 28/10" (with month), a scrollable row with an edge fade.
- Checklist class title no longer navigates back to Overview.
- KGB Eng HW col D (ticks without a date): a quiet note on Sync replaces the sticky warning, and it clears itself once the sheet has a second Current date.
- Deep link to a class not on the sheet falls back to a sheet class.

### Tests
- Unit 54. New e2e: reload, offline-sync, tickall, tap (412/360), contrast (10 screens × 2 themes), touch-gesture, ovchips, title, sync-flow (live sheet), empty (fresh IDB), copy. Seam, back and az-tween probes re-run green.

## 0.26.3 — 2026-10-29 (Asia/Calcutta)

### Back button steps back; press back again to exit (t156u)
- Cause: the app never touched browser history (in-app nav was pure React state), so Android back/gesture back left the page (closed the tab/PWA).
- New `src/nav/backStack.ts`: history laid out as [base][guard][layer 1..n]. Each open layer (Checklist tab, More popup, Settings sub-pages, Tools, Copy, Search) is one entry; a reconcile pass pushes or `history.go(-k)`s so history depth always equals open layers (no double-push, in-app ← buttons stay in sync).
- `popstate` closes the topmost layer first (overlay → page → Overview).
- At root: back lands on base → Quiet Lucid toast "Press back again to exit" (~2s, bottom, non-blocking) and guard re-pushed; second back within window leaves (falls back to `window.close()` for standalone PWA at index 0).
- Reload mid-stack / bfcache restore unwind to the guard; `#checklist` deep link opens Checklist with Overview underneath.
- e2e: `tests/e2e/back-probe.cjs` (412×915).

### Day theme: light A–Z rail + tab bar (t157u)
- A–Z rail used hardcoded `#111318`; tab bar hardcoded `rgba(10,11,14,.92)` → now `--surface` / `--chrome-bar`. Active tab = accent green on `--accent-soft` pill (was dark-on-dark in Day).
- New tokens `--chrome-bar --accent --accent-soft --shadow-pop --scrim` (Night values unchanged); popup/sheet shadows and scrims softened in Day.
- e2e: `tests/e2e/theme-shots.cjs`.

### Only your sheet's classes (t158u)
- Roster, Overview filter chips, Subjects & sheets and Settings now derive from discovered/pulled sheet tabs — no hardcoded Eng/Math/Sci. Before first Sync: "Sync to load your classes".
- Pull purges demo classes not on the sheet (students, rosterMeta, sessions, marks) from IDB.
- Roster copy: source tab + last synced time (removed "Phase E" text). Demo Overview (pre-sync) shows Eng only.

## 0.26.2 — 2026-10-29 (Asia/Calcutta)

### A–Z scrub scroll: quick but smooth (t155u)
- Replaced native `scrollTo({behavior:'smooth'})` with a custom rAF tween (150ms, ease-out cubic), retargeted mid-flight from the current position when the finger moves to a new letter — no queueing, no restart jank.
- Mid-screen snap rule, near-top clamp, end-of-list clamp, first-child highlight, A–Z 42 and left-shift unchanged. `prefers-reduced-motion` → instant.
- Auto-hide chrome is suppressed while scrubbing (scroll listener ignores tween-driven scroll; baseline resynced after scrub end).
- Playwright 412×915: jump duration ~516–550ms → ~134ms. Probe: `tests/e2e/az-tween-probe.cjs`.
- Rollback: tag `v0.26.1` / `d39f183`

## 0.26.1 — 2026-10-29 (Asia/Calcutta)

### Chrome seam root-fix (t154u)
- Lean panel + `#`/`NAME` colhead are now **one opaque `.sw-chrome` block** outside the scroller; colhead no longer sticky. Always flush to panel whether shown, mid-hide, or hidden — names can't peek between them.
- Tick-all column register kept (colhead bar mirrors list insets, incl. A–Z left).
- Playwright seam probe 412×915: before 25/25 frames leak, after 0/25. Notes: `docs/CODE_TRIANGULATION_v0261.md`.
- Rollback: tag `v0.26.0` / `9e6819e`

## 0.26.0 — 2026-10-29 (Asia/Calcutta)

### Sync accuracy — real sheet data, real tabs
- **Parser**: tick dates from **Current** block paired by ordinal (date1→C, date2→D); row-2/header dates kept as fallback; collapsed KGB HW header parsed; unpaired columns warn instead of inventing marks. Live-shaped CSV fixtures in tests.
- **Merge pull (Sync A)**: `submitted` always kept; local `set` edited since last pull wins; first pull per class drops demo marks on non-sheet dates; `engSyncState` stamps `hash` · `sheetSeenAt` · `lastSyncAt`.
- **Sessions off IDB**: pull writes `putSession(<classKey>|current)`; Overview cards + Checklist date pills/topics bind pulled Current. Demo sessions only when nothing pulled.
- **Tab discovery**: rejects gviz default-tab fallback fingerprint → missing Math/Sci tabs never import Eng data.
- **Sync chips** from discovered tabs (`Eng · 4`), auto-discover on open; Subjects & sheets lists real tabs + "not on sheet".
- Docs: `SHEET_MAPPING.md` refreshed · triangulation `docs/CODE_TRIANGULATION_v026.md`.
- Still stub: push / `SoW_*` round-trip, `SoW_Marks` pull, year rollover (uses pull-clock year).
- Live: https://steph1420.github.io/sow/
- Rollback: git tag `v0.25.0` / `1160851`

## 0.25.0 — 2026-10-29 (Asia/Calcutta)

### Immersion pack — opaque chrome · A–Z mid-snap · Submitted purple · DD/MM
- **Opaque sticky chrome**: lean tools + `#`/`NAME` solid `--bg`; names never peek under.
- **A–Z scrub**: first-child highlight · **urgent** smooth list scroll · **mid-snap** (~50% viewport) with near-top clamp (no empty gap) · empty letter → latch next populated (HUD finger letter dim).
- **Lean title auto-hide**: `.sw-lean-main` only on scroll-down / show scroll-up; tools + col-head stay; Quiet ease; honor Reduce motion.
- **Two-date honesty**: pills **DD/MM** (`28/10` · `2/11`); lean topic lists both when two dates active.
- **Hide dimmed letters**: Appearance → Checklist feel toggle (`az.hideEmpty`); default off; Dev mirror.
- **Submitted accent**: Quiet purple `#8b7cf7` (`--sub`); Set stays soft-green `#30d158`.
- **Tick-all column register**: colhead horizontal insets match row (L10/R6); shared 44px tracks; header ✓ on body check axes.
- **Appearance air**: body gap 16 · surface cards · no mid-row cut.
- Coding triangulation: `/workspace/sow-mockups/CODE_TRIANGULATION_immersion.md` · plan `IMMERSION_PLAN.md` · remocks immersion-mj1…mj5 locked (Steve t149u).
- Live: https://steph1420.github.io/sow/
- Rollback: git tag `v0.24.0` / `8a58d64`

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