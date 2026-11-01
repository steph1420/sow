# SoW PWA — Feature reference (v0.46.0-beta.1, 2026-11-01)

Built from the code at tag `v0.46.0-beta.1` and the docs (Steve t14u: "analyse the app and prepare a feature reference book").
**UNVERIFIED** = read from code or docs only; not checked in the running app for this document. Demo names only.

## Sections
1. Channels and sites
2. Screens and routes
3. Checklist grid
4. Gestures
5. Sheets and popups
6. Settings pages
7. Developer options (defaults and ranges)
8. All preferences (keys, defaults, ranges)
9. Submitted (manual / derived)
10. Sync behaviour
11. Bridge (Apps Script `Code.js`) protocol
12. Auto-save, snapshots, updates
13. Keyboard shortcuts
14. Storage keys

---

## 1. Channels and sites
| Site | Repo | Version | Data |
|---|---|---|---|
| https://steph1420.github.io/sow/ | steph1420/sow | v0.45.0 (Steve's daily app; labels per t13u: v0.41.0 = Stable, v0.45.0 = Beta) | per-device Stable/Beta switch (Settings › Sync › Data source): Stable = LIVE bridge (built in, `src/sync/defaultBridge.ts`), Beta = TEST /exec typed on the device; IndexedDB `sow-app` / `sow-app-beta` (`src/sync/channel.ts`) |
| https://steph1420.github.io/sow-beta/ | steph1420/sow-beta (builds the tag in `BETA_REF`) | v0.46.0-beta.1 | always Beta/TEST copy, TEST /exec built in (`src/sync/sheets.ts`), IndexedDB `sow-beta`, localStorage keys prefixed `sow-beta.` |
The `/sow/` workflow skips any prerelease version (`.github/workflows/deploy-pages.yml` gate job). Tokens are never built in.

## 2. Screens and routes (`src/nav/route.ts`, `src/shell/AppShell.tsx`)
- Bottom tabs: **Overview** · **Checklist** · **More**.
- `''` Overview — class cards, collapsed by default; tap a card → All dates (`src/overview/OverviewPage.tsx`, `SessionCard.tsx`, `AllDatesPage.tsx`). Past dates use the amber "past" look, and Back restores the current view (03_NEXT Locked).
- `#checklist/<ClassKey>` — Checklist for KGA_Eng_CW, KGB_Eng_CW, KGA_Eng_HW, KGB_Eng_HW, KGA_Math_CW, KGB_Math_HW (`src/data/types.ts`). Only classes present as real sheet tabs/Subjects are shown.
- More stack `#<id>/<id>…` (each segment is one Back step): `settings`, `roster`, `history`, `sync`, `appearance`, `subjects`, `sharing`, `about`, `dev` (`src/more/navStack.ts`).
- Overlays not in the URL: More popup, Tools, Search, sheets.
- Desktop: landscape ≥ 1000 px fills the width, scale = innerHeight/600 (cap 2.4); open tabs check for updates every 5 min (`src/lib/a11yRuntime.ts` installWideScale, `src/pwa/updateFlow.ts`).

## 3. Checklist grid (`src/checklist/ChecklistPage.tsx`, `state/useChecklistModel.ts`)
- Row = roll, name, then 1 or 2 date tick boxes. The 1/2-date view is per device (`sow.dateCols`); a new device starts on 1 date (`src/dates/sessionEdit.ts`). Columns are oldest-first; picking the other column's date swaps the columns.
- Modes: **Set** and **Submitted** (`M` key / mode control). Submitted shows manual OR Set (§9).
- Left pupils are hidden from the grid (`filteredRoster`). Search filters by name/roll. Pending-only hides pupils done on all visible dates.
- Footer row: Tick all / Untick all per visible date (t83u).
- Header: date pills open the Date popover; topic shown for the newest visible date.
- A–Z strip (`src/checklist/az/AzStrip.tsx`): scrub to jump to a letter; HUD while scrubbing (pref); idle width 42 and letter ≥ 11 px are floors.
- Quick find HUD (`/`, `chrome/QuickSearchHud.tsx`): prefix, initials, partial and typo matching; the list stays whole.
- Undo/redo per class; a pull clears undo only when it changed a tick (`src/lib/undoStack.ts`, engine).
- Autosave icon left of Undo (`src/backup/AutoSaveIcon.tsx`): hidden at rest; ring → tick; cloud + count when offline; amber on error (tap = retry).
- Channel badge "BETA · TEST copy" on Beta (`src/components/ChannelBadge.tsx`).

## 4. Gestures (`src/checklist/gestures/*`)
- **Tap a box**: toggles Set (Set mode) or the manual Submitted flag (Submitted mode). Movement < 8 px counts as a tap.
- **Swipe on the ✓ boxes** (v0.46, t5u; `swipePath.ts`): starts when the stroke is mostly horizontal (|dx| ≥ 10 px and ≥ 1.15·|dy|, `paintPhysics.ts`). Each box the finger passes lights up; on lift only the lit boxes change. The value is the toggle of the start row: if every visible box in the start row is ticked, the swipe clears; otherwise it ticks. Going back un-lights boxes; back on the start box at or behind the starting x (12 px slop) cancels. Fast flicks fill skipped boxes (`crossedColumns`) and skipped rows. Commits as one undo step.
- **Vertical extension**: moving to other rows only after the t170u hesitancy (≥ 28 px past the start row edge and ≥ 60 % into the next row, `extendTarget`). Off when Developer › "Swipe ticks one row only" is on.
- **Swipe from the name** (v0.31, t5u; `nameSwipe.ts`): a touch on the name arms a swipe only at or right of the Developer **Swipe from name** fraction (Off / 30 % / 50 % / 70 %, default 50 %). Left of it, the name keeps native scroll and long-press. Boxes respond only once the finger crosses them; a name touch alone never ticks. Verified by `tests/e2e/name-swipe-setting-probe.cjs` at every setting (same 16/16 results on v0.45.0 and v0.46.0-beta.1).
- **Swipe cue** (Developer › Swipe confirm, `swipeConfirm.ts`): Blue ring · A Soft tint · B Ghost ✓ · C Edge sliver · D Trailing wash (default from v0.46) · B+A Ghost ✓ + tint. The cue clears on release in the same frame.
- **Long-press a name** 800 ms (`SELECT_HOLD_MS`, `selectPhysics.ts`) → select mode; drag on the roll column extends the selection; Select bar actions (`chrome/SelectBar.tsx`, UNVERIFIED list of actions).
- **Swipe up on the Checklist tab** → Quick overview.
- **Sheets**: drag the top 64 px down to close (> 30 % or a flick > 0.5 px/ms), else spring back (`installSheetDrag`).
- **Date popover rows**: tap selects; hold or swipe left → Edit (03_NEXT Locked).

## 5. Sheets and popups
- **Date popover** (`chrome/DatePopover.tsx`): plain date list, tap selects, "Add Date" pill, 1|2 date toggle; selected rows = thin green left bar, green text, ✓.
- **Date edit / add modal** (`chrome/DateEditModal.tsx`, `DatePicker.tsx`, `src/dates/dial.ts`): date dials (Year dropdown + Month/Date/Day), topic, ✓, Cancel, small 🗑. Delete warns with the mark count and offers Undo; marks move with the date; delete/move = one undo step.
- **Quick overview** (`chrome/QuickOverviewSheet.tsx`): both dates at a glance.
- **Tools**, **More popup**: entry points (UNVERIFIED exact rows).
- **Share sheet** (`src/share/ShareSheet.tsx`): named templates with chips `{class} {date} {topic} {names.notSet} {names.set} {names.submitted} {names.notSubmitted} {names.left}` and counts `{count…}` (`shareTemplates.ts`); copy or WhatsApp; optional KGA/KGB prefix.
- **Restore snapshot** (⋮ › Restore snapshot…, `src/backup/Backups.tsx`): amber confirm with ticks then/now and how many would be undone; saves "Before restore" first; rewrites phone and sheet.
- **Keyboard shortcuts** (`?`, `src/shell/ShortcutsSheet.tsx`).
- **Pair / Join / Import** devices (`src/more/SetupDevices.tsx`): 6-digit pairing code, 300 s, 5 tries; setup file `sow-setup.sowsetup` holds the token in plain text.

## 6. Settings pages (`src/more/*`)
- **Settings** (`SettingsPage.tsx`): Classroom (Roster, History, Sharing), Sheet · subjects, Appearance (Night · Day), System (Dev options, About, Keyboard shortcuts, Backups — UNVERIFIED placement of Backups).
- **Sync** (`SyncPage.tsx`): Data source card (/sow/ only; Beta site shows a fixed note), **Check connection** (v0.46: sheet label TEST copy / LIVE / Other by sheet id, bridge version; bridge 0.44 → label from the Settings sheet URL plus a note), clock warning when the phone is > 10 min off, Status, Connections (sheet URL, bridge URL masked, token hidden), Sync now, Pair/Join/Import, Prefs sync card.
- **Appearance** (`AppearancePage.tsx`): Mode Night/Day, Follow system, Colour theme (`src/theme/palettes.ts`), Contrast −1 … +1 (step 0.1; Softer · Default · Stronger), Reduce motion, Haptics intensity (Off/Light/Normal/Strong), A–Z: Hide dimmed letters, FAB.
- **Subjects** (`SubjectsPage.tsx`): tabs found on the sheet.
- **Roster** (`RosterPage.tsx`): pupils per class, mark Left/Active (synced, §10).
- **History** (`HistoryPage.tsx`): past mark sessions (UNVERIFIED detail).
- **Sharing** (`SharingPage.tsx`): templates (drag to reorder), default template, Include KGA/KGB prefix.
- **About** (`AboutPage.tsx`): version from package.json (never hard-coded; `scripts/check-version.mjs`).
- **Backups** (`src/backup/Backups.tsx`): Back up now, snapshot list, restore.

## 7. Developer options (`src/more/DevPage.tsx`)
| Section | Option | Pref key | Default | Range |
|---|---|---|---|---|
| Sync bridge | Bridge URL override (/exec), masked, validated (v0.46) | localStorage `sow.bridgeOverride` (Beta site: `sow-beta.sow.bridgeOverride`) | blank = built-in address | only `https://script.google.com/macros/s/…/exec` |
| A–Z | Left-side A–Z | `az.leftSide` | off | on/off |
| A–Z | Hide dimmed letters | `az.hideEmpty` | off | on/off |
| A–Z | Show scrub HUD | `az.showHud` | on | on/off |
| Gestures | Swipe ticks one row only | `gestures.swipeSingleRow` | off | on/off |
| Gestures | Keyboard tick moves to next pupil | `kbd.autoAdvance` | on | on/off |
| Gestures | Swipe from name | `gestures.nameSwipeFrom` | 0.5 (50 %) | 0 Off · 0.3 · 0.5 · 0.7 |
| Gestures | Swipe confirm | `gestures.swipeConfirmStyle` | `wash` (v0.46; was `blue`) | blue · tint · ghost · sliver · wash · ghostTint |
| Sync | Academic year starts | `sync.yearStartMonth` | 4 (April) | 1–12 |
| Sync | Bridge URL override on Join | `sync.joinUrlOverride` | off | on/off |
| Chrome | Sort/Filters FAB | `chrome.showFab` | off | on/off |
Section names other than "Sync bridge", "A–Z", "Sync", "Chrome" are UNVERIFIED (the gesture rows sit under a section header not re-read here).

## 8. All preferences (`src/prefs/appPrefs.ts`, localStorage `sow-app.prefs.v1`)
`theme` night · `theme.followSystem` false · `appearance.contrast` 0 (−1…1) · `chrome.showFab` false · `chrome.reduceMotion` false · `az.leftSide` false · `az.hideEmpty` false · `az.showHud` true · `gestures.swipeSingleRow` false · `gestures.swipeConfirmStyle` wash · `gestures.nameSwipeFrom` 0.5 · `kbd.autoAdvance` true · `haptics.enabled` true · `haptics.level` normal (off 0 / light 0.6 / normal 1 / strong 1.5 × pulse, `src/lib/haptics.ts`) · `share.templates` seed set · `share.defaultId` pending · `share.lastUsedId` '' · `share.includeClassPrefix` false · `sync.yearStartMonth` 4 · `sync.joinUrlOverride` false.
Prefs sync (`src/sync/prefsSync.ts`, `prefsRunner.ts`): a hidden Prefs tab on the sheet; per-key newer-wins; categories can be switched on and off (the Gestures category is on by default).

## 9. Submitted (manual / derived) — v0.46, t5u (`src/data/submitted.ts`)
- Shown Submitted = manual OR Set. Stored `Mark.submitted` is the manual flag.
- Tap Submitted: makes it manual; tapping a manual one returns it to derived (still shown ticked if Set is on).
- Paint/Tick all in Submitted mode writes the manual flag.
- Share/overview counts use the shown value.
- Sync: bridge ≥ 0.46 stores the manual flag in Ticks!J `subManual`; bridge 0.44 → stays on the phone. Old manual ticks migrate via `subs` ("only turn on") until the sheet confirms them (`Mark.sheetSub`).
- Derived and manual look the same in the grid (open question).

## 10. Sync behaviour (`src/sync/engine.ts`, `bridge.ts`, `autoSaveRuntime.ts`)
- With bridge URL + token: one push (if anything changed since `bridgeSyncAt`) or a pull; the push reply carries full sheet state, which is applied newer-wins per tick (phone tick newer than the sheet's survives and is pushed next).
- Without a bridge: gviz CSV pull of readable tabs; push "not set up".
- First bridge pull of a class on a device: the sheet wins entirely.
- Left: phone → sheet per section (KGA/KGB, newest per pupil); sheet → phone per pupil newer-wins; loaded back into the lists (fixed v0.46).
- Topic edits, rename/delete date (`structOps`) queue on the phone until a bridge that supports them confirms.
- Clock: the app sends `clientNow`; bridge 0.46 shifts stamps by server−phone offset when > 30 s; all bridges clamp stamps > 10 min in the future.
- Offline: marks stay on the device; queued; sent on `online`.
- Auto-sync on open/foreground is skipped when nothing is waiting and the last sync was < 60 s ago (v0.46). Manual Sync never skips.
- Sync now from the bridge does not need readable tabs (`syncGate.ts`).

## 11. Bridge protocol (`apps-script/Code.js`, v0.46.0)
POST JSON (text/plain) to `/exec`: `ping` (v0.46 adds `sheetId`), `pull`, `push` {ticks, roster, sessions, structs, subs, clientNow}, `prefsPull`, `prefsPush`, `pairStart`, `pairClaim`, `pairCancel`. Token in Script Properties `SOW_TOKEN`; tombstones `SOW_TOMBS`. Every reply carries `version` and `serverNow`.
Tabs: Roster · Subjects · Sessions · Ticks (I = pupilStatus formula, J = subManual) · Entry · Dashboard (formulas) · _Meta. Sheet menu: Setup + migrate, Show app token, Remove a subject (backup first). onEdit stamps edited rows; Entry tab ticks go through the same push.
v0.46 writes only changed Ticks rows, plus Sessions/Roster only when they changed; blank gap rows → full rewrite. The old-vs-new identical-sheet check is `apps-script/test/v046.test.ts`.

## 12. Auto-save, snapshots, updates
- Auto-save (`src/sync/autoSave.ts`): push 2 s after ticking stops, at most 30 s while ticking; flush on hide/pagehide; pull on open and on return to the foreground.
- Snapshots (`src/backup/snapshots.ts`, IDB `snapshots`): after change batches, on open, before sync and before an update; keep the last 50 plus one per day for 30 days.
- Updates (`src/pwa/updateFlow.ts`): checks on foreground/focus and every 5 min; v0.46: a new service worker waits until the "before update" snapshot is written and read back, then activates (3 s cap); the page reloads only when no finger is down.
- Install: Android prompt; iOS steps sheet (Settings › App › Install as app) (`src/pwa/install.ts`).

## 13. Keyboard shortcuts (`src/lib/keyboard.ts` SHORTCUTS — single source for the `?` sheet; Mod = ⌘ on Mac, Ctrl elsewhere)
**Anywhere**: `?` shortcuts · Mod+1/2/3 or Alt+1/2/3 Overview/Checklist/More · `[` `]` previous/next tab · Mod+, Settings · Mod+S Sync now · Mod+Shift+L Night/Day · Esc close sheet / leave search, strip or select · Alt+← or Backspace Back · Tab/Shift+Tab · Enter/Space activate · PgUp/PgDn, Space/Shift+Space, Home/End scroll.
**Checklist**: arrows move · PgUp/PgDn ±10 rows, Home/End first/last · Space/Enter tick then next pupil (Dev option) · 1/2 tick date 1/2 · L mark Left (Mod+Z undoes) · Shift+Space row swipe both dates · Shift+↑/↓ select rows · A tick/untick all for the focused date · D dates · M Set ⇄ Submitted · P pending only · O quick overview · Mod+F filter by name · Mod+Z / Mod+Shift+Z undo/redo.
**Overview**: ↑↓ cards · Enter expand.
**Quick find**: `/` open · type (prefix, initials, part, typo) · ↑↓ / Tab next/previous match · Enter into the grid · Backspace edit · Esc close.
**A–Z strip**: Tab to the strip, then a letter.

## 14. Storage keys
IndexedDB: `sow-app` (Stable channel), `sow-app-beta` (Beta channel on /sow/), `sow-beta` (Beta site) — stores students, marks, sessions, rosterMeta, settings, snapshots (`src/data/db.ts`).
localStorage: `sow.channel`, `sow.betaUrl`, `sow.bridgeOverride`, `sow-app.prefs.v1`, `sow-app.prefsync.v1` (all prefixed `sow-beta.` on the Beta site); shared between the two sites: `sow.dateCols`, `sow-app.clockSkew`, `sow-app.installNudgeSeen`.
