# Changelog

## 0.40.0 — 2026-10-30 (Asia/Calcutta)

Checklist header rework + topic editing + sheet feel (Steve t83u, t84u, t85u–t88u). Rollback: tag `v0.39.0` / `607312c`. **Code.js changed (bridge 0.40.0, backward compatible)** — re-paste + New version to sync topics; until then topic edits stay on the phone with a note. CRDT op log renumbered to v0.41.0.

- Overview cards: **Last:** replaces "Latest:" for a past session (Upcoming / Today unchanged).
- Checklist top header: topic removed; the dates (oldest → newest, e.g. 28/10 · 2/11 ▾) sit on the right. Tapping them opens the **Dates** panel: 1 date / 2 dates, pick which date in 1-date view, and view / edit each session's topic (Save; up to 200 characters). The date chip row is gone (absorbed into the panel).
- Column header is now two rows: **date**, then the **topic** cut with "…". The whole header cell (≥44 px) is one button: tap it for a toast with the full topic (date and topic as two separate buttons would each be under 44 px tall). The Dates panel opens from the top-right dates or **D**. **No counts in the header** (t84u) — counts live in Quick overview. Screen readers hear "Wed 28, topic: <topic> — show full topic". Tapping the header no longer ticks the column.
- **Tick all** moved to a footer row under the list: one button per date column, "Tick all" / "Untick all". Keyboard: Tab to the buttons, or **A** in the grid ticks / unticks the focused date column; **D** opens the Dates panel. The ? sheet lists both.
- Topic edits are saved on the device at once and pushed on the next Sync as `sessions` ops (newer wins on `updatedAt`; missing session rows are created). A bridge older than 0.40.0 ignores them: the edit stays pending and Sync shows "Update bridge script to sync topics".
- **Fix (t85u–t87u): Quick overview needed two taps to close** (backdrop and Close). See BUGS. Every control in every sheet now works on the first tap.
- **Bottom sheets follow the finger 1:1 from the first pixel** (t88u): drag the top of any sheet (Quick overview, Dates, Tools, Copy, More, Shortcuts, Spotlight). Release past 30 % of its height or with a flick (> 0.5 px/ms) closes it; otherwise it springs back. The grab zone consumes the touch so Chrome no longer holds back the first ~15 px of movement. Share sheet keeps its own (already 1:1) drag.
- Tests: unit `topicEdits` (5), `dateLabel` updated, bridge `code.test` +2 (topic newer-wins/ignore/create/reject; old payload → `sessionsApplied: 0`); e2e new `v040-probe` (30 checks), `v040-shots`/`serve-shots` (screenshots), `topic-sync-probe` (routed fake bridge — never the live sheet), `sheet-tap-probe` (one-tap close from all 3 openers + 1:1 drag / 30 % / flick / spring-back); `tickall-probe`, `v039-probe`, `v029-probe`, `tap-probe`, `title-probe`, `keyboard-probe`, `dates-touch-probe` updated for the footer / Dates panel.

## 0.39.0 — 2026-10-30 (Asia/Calcutta)

Header cleanup + quick overview + calendar date order (Steve t74u, t76u–t82u; built without mock lock per t81u). Rollback: tag `v0.38.0` / `d109227`. **No Code.js change.** CRDT op log renumbered to v0.40.0.

- **Dates always in calendar order** (oldest → newest, e.g. 28/10 then 2/11) for chips, columns, headers, Quick overview and Share (t82u LOCKED). The sheet/bridge still stores newest-first; the app flips once (`datesFromSession`). Ticks, undo, keys 1/2 and column focus follow the date itself, not its position.
- **Checklist header**: each tick column now has its date and count on top (e.g. 28/10 · 15/44). Tapping it still ticks/unticks the whole column (the old '−' box, merged in). The top-right '16/44 SET' is gone (it counted only one date). 1-date view shows one header. Header topic and Share default use the newest visible date.
- **Quick overview** sheet: both dates with count, bar, pending and %, plus how many pupils are marked Left. Open with Tools › Quick overview, a swipe up on the Checklist tab (40 px, vertical only, ignores the bottom 16 px OS gesture edge, short haptic; a small grabber shows on the tab), or **O**. Swipe down, Esc or Close shuts it; focus returns when opened by keyboard.
- **Overview**: 'HOME' eyebrow and the '2/11 · pick a class to mark' subtitle removed (no other page had that pattern). Collapsed cards say **Upcoming:** / **Today:** / **Latest:** before the date — the card shows the class's newest open session, which can be in the past, so it only says Upcoming when the date is after today.
- Date chips row kept: it is the only way to switch to 1-date view.
- Share opens on the newest date (same date it opened on before the flip; now it is the second chip).
- Tests: unit `dateLabel` (4), `dateOrder` (4); e2e `v039-probe` (30+ checks), `v039-dogfood` (real touch + keyboard).

## 0.38.0 — 2026-10-30 (Asia/Calcutta)

Spotlight-style quick find + date-column hardening (Steve t67u, t68u; approved t69u). Rollback: tag `v0.37.0` / `5e9dc4b`. **No Code.js change.** CRDT op log renumbered to v0.39.0.

- **/ opens Quick find**: a small HUD at the top shows the word you type; the list stays whole and scrolls live to the best match. Matching ranks roll number, first-name prefix, other-name prefix, multi-word prefix ("kab se"), initials ("rk" → R… K…), part of the name, typo (1 edit for 4+ letters, swaps count as 1), then letters-in-order; ties go by roll. Shows "2 of 3". ↑/↓ or Tab/Shift+Tab cycle, Enter puts you in the grid on that pupil (Space ticks), Backspace edits, Esc closes and returns focus. After 1.5 s idle the HUD stays and the match row lights up. A single letter still lands on the first pupil with that letter. Replaces the old "/" strip mode; the A–Z strip stays clickable (and Tab-focusable with letter keys).
- Mod+F stays a separate filter (hides non-matching pupils).
- Dates: ←/→ move between date boxes, Space ticks only the focused box, Shift+Space both; new **1 / 2** keys tick date 1 / date 2 on the row (2-date view; 33% fewer keys in the dogfood). Focused date column header is highlighted. Screen-reader label names the date ("Wed 28, date 2 of 2").
- 1-date view verified: keyboard, row swipe, name swipe, tap, undo/redo never touch the hidden date.
- **Fix (t71u–t73u): no focus ring with touch on any page.** Rings show only after a real keydown; a tap hides them. Focus is moved on screen change / sheet open only when you were using the keyboard. New `modality-probe` taps through every page and sheet.
- **Fix (t75u): Overview cards all start closed** on load and navigation (the active card used to open itself — behaviour since ≤ v0.28, not v0.37.0). Keyboard landing focuses a card, never opens it.
- Fix: a running A–Z / scroll tween no longer fights keyboard focus; keyboard focus keeps clear of the tab bar.
- Tests: unit `quickSearch.test.ts` (12); `keyboard-probe` now covers quick find + date columns (Ctrl and Cmd runs); new `dates-touch-probe` (real touch, date A and date B); `kbd-dogfood` adds 10 quick-find lookups and mixed-date marking.

## 0.37.0 — 2026-10-30 (Asia/Calcutta)

Full keyboard + desktop widescreen (Steve t62u, t64u "go all the way till push", t65u thorough, t66u dogfood; plan docs/KEYBOARD_WIDESCREEN_PLAN.md). Rollback: tag `v0.36.1` / `9b90dc3`. **No Code.js change.** CRDT op log renumbered to v0.38.0.

- Press **?** anywhere (or Settings › Keyboard shortcuts) for the full list. Cmd on Mac, Ctrl elsewhere; never Cmd/Ctrl+W/T/N/Q.
- Anywhere: Mod+1/2/3 and Alt+1/2/3 (Overview · Checklist · More), [ / ] previous/next tab, Mod+, Settings, Mod+S Sync now, Mod+Shift+L Night/Day, Esc closes, Alt+← / Backspace back, PgUp/PgDn/Home/End/Space/Shift+Space scroll pages.
- Checklist: one Tab stop into the ticks; arrows, PgUp/PgDn (10 rows), Home/End; Space/Enter tick then move to next pupil (Developer option); Shift+Space = row swipe; Shift+↑/↓ select; M Set⇄Submitted; P pending only; **L marks a pupil Left** (Mod+Z undoes); Mod+F search; Mod+Z / Mod+Shift+Z / Mod+Y undo/redo. Screen reader hears each tick.
- A–Z strip: **/** focuses it, a letter jumps (again = next pupil with that letter), ↑/↓ letters, Enter into the grid, Esc back. Letters do nothing outside the strip.
- Overview: ↑/↓ between class cards. Focus always lands somewhere useful after a screen change.
- Every sheet: focus moves in, Tab is trapped, Esc closes, focus returns. Toggles are real switches for screen readers.
- Visible focus ring (3 px accent + halo) in Night and Day.
- Widescreen: the same phone UI scaled to the window (up to 1.6×), e.g. ×1.18 at 1920×1080.
- Tests: `keyboard-probe` (66 checks, Ctrl and Mac/Cmd runs) exercises every shortcut; `kbd-dogfood` workflows at 1920×1080 and 412×915 with keyboard; unit `keyboard.test.ts`.

## 0.36.1 — 2026-10-30 (Asia/Calcutta)

Clock guard (Steve t54u "I'm mainly concerned for data - ticks and all"; Q-CRDT-1 LOCKED t55u "Ship v0.36.1 first"). Rollback: tag `v0.36.0` / `f5010e4`. **One combined Code.js (prefs actions + clock guard) — re-paste once + New version.**

- Bridge: a tick, Left or settings stamp more than 10 min ahead of the Apps Script clock is clamped to the server time, so a phone with a fast clock can no longer block later honest edits. Replies carry `serverNow` and `clamped`. Version 0.36.1.
- App: Sync page warns "This phone's clock is 1 day fast/slow…" when the phone differs from the sheet's clock by more than 10 min (measured on each bridge reply).
- Plan: docs/CRDT_SYNC_PLAN.md locked (t55u) — full op log is v0.37.0.
- Tests: unit 205 (+7: `apps-script/test/clockguard.test.ts` 3, code.test clock case 1, `src/sync/clockSkew.test.ts` 3). New `clock-probe` (4 checks). All probes green at 412×915.

## 0.36.0 — 2026-10-30 (Asia/Calcutta)

Settings sync across paired devices (Steve t49u; plan docs/PREFS_SYNC_PLAN.md; locks t52u). Rollback: tag `v0.35.1` / `ba27194`. **Needs Code.js re-paste + New version** for the sync itself; until then the app says "Update bridge script" and changes nothing.

- Settings › Sync › **Sync settings across devices**: master toggle; Appearance (colour theme, Follow system), **Night / Day** (own toggle), Checklist feel, Gestures, Share templates, **Academic year — Always synced** (fixed row, no toggle), Developer options (default **off**). "Sync settings now", last-synced time. Toggles are per device.
- Never synced: bridge token, sheet/bridge URLs, haptics, reduce motion (card "Never synced · this device only"). The bridge also refuses those keys.
- Whole-category newer-wins: changing one setting stamps its whole category. Sheet rows are per key (key, category, value, updatedAt, deviceId) in a hidden **Prefs** tab; keys this version doesn't know are kept (on the sheet and locally) and picked up by later versions.
- First join: "Paired ✓ · Which settings?" — **Use synced settings** (default) / Use this device's settings / Not now (sync off). The first device seeds the sheet. Quiet settings sync on app open and after Sync now.
- Apps Script v0.36.0: `prefsPull`, `prefsPush` under LockService; older actions unchanged.
- Tests: unit 198 (+19: `src/sync/prefsSync.test.ts` 7, `src/sync/prefsRunner.test.ts` 5, `apps-script/test/prefs.test.ts` 7). New `prefsync-probe` (22 checks, Night+Day, old + new bridge). All probes green at 412×915.

## 0.35.1 — 2026-10-29 (Asia/Calcutta)

Install as app (Steve t52u: "8. Settings › App", "10. Once"; mock prefsync-mj1-c, moved from More to Settings › App). Rollback: tag `v0.35.0` / `b06e12e`.

- Settings › **App** › Install as app: Android / desktop Chrome & Edge open the browser's install prompt (`beforeinstallprompt`, captured at startup); iPhone/iPad open a 3-step Share › Add to Home Screen sheet. Hidden when running installed (`display-mode: standalone` / `navigator.standalone`) or after `appinstalled`, and where no install path exists.
- One-time nudge on first open (Install / Show me how · Not now). The seen flag (`sow-app.installNudgeSeen`) is saved when it shows; it never returns.
- BUGS.md: corrected the old claim that an iPhone install hint already existed.
- Tests: unit 179 (+5 `src/pwa/install.test.ts`). New `install-probe` (9 checks, iOS UA, Night+Day, standalone hidden). All probes green at 412×915.

## 0.35.0 — 2026-10-29 (Asia/Calcutta)

Colour themes (Steve "I'll take all the themes"; mocks themepicker-mj1 + theme-mj2-all; decisions LOCKED t48u "1 Yes 2 Appear 3 OK 4 YES 5 YES Yes"). Rollback: tag `v0.34.1` / `25ba398`.

- More › Appearance: **Colour theme** list above Mode — Default (Quiet Lucid) first, then Tangerine Orange, Agartha theme, Sky, ExploreMiam, Minimal Forest, Vivid Sky, CuteSpringTheme, Black and pink. 5-colour Night swatch strip, ✓ on the chosen one, rows ≥44px.
- Each theme has Night and Day and follows the Night/Day switch (and Follow system). Choice saved in IndexedDB (`settings.palette`).
- Ticks fill with the theme primary (dark tick glyph on themes 1–4 accepted). Theme 7 Day primary deepened #ffb7c5 → #e64980 (3.6:1, ticks clearly visible). Text colours auto-nudged to AA 4.5:1 per theme.
- System font only (theme fonts not shipped). Submitted / Warn / Left colours stay fixed.
- Old literal greens now come from `--tint`/`--tint2` (same values in Default → no visual change).
- Tests: unit 174 (+7 `src/theme/palettes.test.ts`). New `tests/e2e/themes-live-shots.cjs` (20 checks, Night+Day, all 8) → `sow-mockups/themes-live-*.png`. All non-sheet probes green at 412×915.

## 0.34.1 — 2026-10-29 (Asia/Calcutta)

Joining a device needs only the code (Steve t47u "Why does joining ask for bridge url... beats the purpose of code", t48u "Please do it"). Rollback: tag `v0.34.0` / `dfa7e68`.

- Steve's bridge `/exec` address is built in (`src/sync/defaultBridge.ts`) and used whenever no URL is stored. Address only; the token is never built in and still arrives via pairClaim / setup file.
- **Join with a code** shows only the six digit boxes. A Bridge URL override field appears there only with Developer options › Sync › "Bridge URL override on Join".
- Sync status "Push: Connected" now also requires a token (the URL is always present now).
- Tests: unit 167 (+5 `src/sync/defaultBridge.test.ts`). `setup-pair-probe` updated (no URL field; built-in URL saved) — 21/21; all non-sheet probes green at 412×915.

## 0.34.0 — 2026-10-29 (Asia/Calcutta)

Set up another device without retyping the URL + token (Steve t36u setup file, t38u "Add the Pairdrop style as well please!"; mocks setuppair-mj1 **LOCKED t39u "Lock all"**). Turn t39u. Rollback: tag `v0.33.1` / `386a861` (app) — the old Code.gs keeps working with v0.34.0 apart from pairing/ping.

- Settings › Sync: **Other devices** card — Pair a device ›, Join with a code ›, Setup file [Export] [Import]. Bridge token field gets "Hidden · saved on this device only" (closes the token-field mock).
- **Pair a device** (host): asks the bridge for a 6-digit code, shows it large with a 5:00 countdown + bar, "One use · expires in 5 min", Cancel (cancels the code), New code once expired.
- **Join with a code** (new device): bridge URL + six 44px digit boxes (paste fills all), Pair → token saved on the device, then Sync now runs; wrong code shows tries left.
- **Setup file**: Export writes `sow-setup.sowsetup` (JSON kind sow-setup v1: URL, token, sheet URL, time) via the share sheet, else a download. Import validates it, shows a confirm sheet (URL, token masked to its last 4, export time); Apply pings the bridge first and changes nothing if the token is refused.
- Apps Script (needs re-paste + New version): `ping`, `pairStart` (token), `pairClaim` (code → token; salted SHA-256 in Script Properties `SOW_PAIR`, 300 s, single use, 5 wrong tries → locked, script lock), `pairCancel` (token). Every reply carries `version: "0.34.0"`.
- Plan: `docs/SETUP_PAIRING_PLAN.md`. Triangulation: `docs/CODE_TRIANGULATION_v0340.md`.
- Tests: unit 162 (+14: `apps-script/test/pair.test.ts` 7, `src/sync/setupPair.test.ts` 7). New real-touch `setup-pair-probe` (21 checks, routed fake bridge). 24/24 probes green at 412×915.

## 0.33.1 — 2026-10-29 (Asia/Calcutta)

Apps Script fix found reading the live copy after Steve's setup (t23u). Rollback: tag `v0.33.0` / `dc73c54`. Not deployed to Pages.

- **Fix: push would fail once Ticks passed 1000 rows** (new tabs are created with 1000 rows; about 15 more sessions). Writes, the Entry list and Remove-subject backups now add rows first. App code unchanged.
- Live copy checked read-only: 89 pupils (KGA 44 / KGB 45), 4 subjects, 7 sessions, 311 ticks, 3 Left, Dashboard shows numbers with no formula errors, 3 swapped dates flagged in _Meta.
- Bridge token field (Settings › Sync, from v0.33.0) ships ahead of its Night/Day mock by Steve's approval ("Ship v0.33.1 tonight, mock the token field later"); mock pending.
- Live e2e on the copy: pull, push, revert and older-ignored verified; 22/22 probes green.
- Tests: unit 148 (+1).

## 0.33.0 — 2026-10-29 (Asia/Calcutta)

Push bridge + clean sheet layout (Steve t13u "finish the push bridge today", t14u goals, Q-SHEET-1…6 LOCKED t17u/t18u). Rollback: tag `v0.32.1` / `83d79f9`. **Not deployed to Pages** until the bridge is verified end-to-end on the copy.

- New `apps-script/` (Code.js, appsscript.json, README with Steve's steps): one-time setup + migrate into Roster · Subjects · Sessions · Ticks · Entry · Dashboard · _Meta (formulas; locale en_IN); token bridge doPost/doGet with LockService and per-tick newer-wins; Entry checkboxes and hand edits stamp updatedAt; Remove subject backs up to Drive first and gives an .xlsx download link. Old `SoWSync.gs` kept as `apps-script/legacy/` (not deployed).
- App: Settings › Sync gets a **Bridge token** field. With URL + token, Sync now pushes ticks/Left changed since the last bridge sync, then applies the sheet state (newer tick wins per tick; Left per section; roster from the sheet; a class is purged only when Subjects no longer lists it). Bridge unreachable → read-only gviz of the new tabs, changes stay on the phone and stay unsynced. Without a token the app behaves exactly as v0.32.1.
- Submitted is not sent to the sheet (Q-SHEET-1: Set means submitted).
- Tests: unit 147 (+`apps-script/test/code.test.ts` 10, `src/sync/bridge.test.ts` 9).

## 0.32.1 — 2026-10-29 (Asia/Calcutta)

Push hints rewording (Steve t11s1). Rollback: tag `v0.32.0` / `3153c17`.

- **LOCKED (Steve, 2026-10-29 3:13 PM IST, t11s1 "Lock the proposed push hints"):** Sync top hint "…Push not set up yet." · under Sync now "Pulls selected tabs · marks save on this device · push not set up." · About "…push not set up yet." Mocks: `/workspace/sow-mockups/pushhints-mj1-*`.
- Text only; no behaviour change.

## 0.32.0 — 2026-10-29 (Asia/Calcutta)

Config/privacy, Q-FIX-4B LOCKED (t3u "4. B"): workbook URL blank by default, entered in Settings > Sync. Steve t6u "Also continue to other fixes or plans you had". Rollback: tag `v0.31.1` / `8c5cf8c`.

- **A fresh install no longer comes pointed at Steve's workbook.** Settings > Sync starts empty ("Sheet: Not set"); paste the URL there. Phones that already have the URL keep it (it's stored on the device, nothing is migrated or cleared).
- The workbook ID is gone from the app code and bundle (kept in docs/ and git history per Q-FIX-1C).
- Uses the existing Sync screen; no new UI. Mocks of the blank state Night+Day: `/workspace/sow-mockups/blankurl-mj1-*`.
- Tests: unit 128 (seed now expects a blank URL; sync tests set a test sheet). Sheet probes (`sync-flow`, `offline-sync`) enter the URL from `SOW_SHEET_URL` like Steve would. 23/23 probes green.

## 0.31.1 — 2026-10-29 (Asia/Calcutta)

Tidy, no visible change. Steve t6u "Also continue to other fixes or plans you had" (plan item v-next tidy, review t2u). Rollback: tag `v0.31.0` / `f8b4145`.

- Screen-reader names for the date pills ("Show date 28/10", pressed state) and the ↶/↷ buttons (Undo/Redo).
- Saving no longer starts from inside a React state update (it could fire twice under StrictMode); edits made back-to-back still chain.
- Dead code removed: `sync/bridge.ts` (placeholder push, unused since v0.29.2), `seedDemoMarks`, `toDdMm`, `selectedCount`.
- Tests: unit 128; new `a11y-probe` (every control on 12 screens has a name). 23/23 probes green.

## 0.31.0 — 2026-10-29 (Asia/Calcutta)

Version label + app updates (Steve t4u "Stuck in 0.29.0") and swipe from the name row (Steve t5u "Make the swipe recognised from about half the length of the name row. But checkboxes only respond when I cross over them."). Rollback: tag `v0.30.0` / `2db49a2`.

- **Fix: version shown.** Settings and About now read the version from `package.json` at build time (`__APP_VERSION__`); they had `0.29.0` hardcoded. Build fails if a version literal comes back (`scripts/check-version.mjs`).
- **Fix: installed app stuck on an old build.** The service worker now takes over at once (`clientsClaim`, `skipWaiting`, old caches cleaned) and the app checks for a new build every time it comes to the foreground or gains focus. When one arrives it saves pending ticks and reloads, never mid-touch.
- **Swipe from the name row.** A swipe can now start from the right half of the student's name. Nothing ticks until your finger crosses a box; only the boxes you cross change (same tick/clear rule as before). Vertical drags still scroll; long-press on the name still opens Select. Developer → **Swipe from name**: Off / 30% / 50% (default) / 70%.
- Swipe-confirm cues now show only on the boxes that will change.
- Tests: unit 128 (+`nameSwipe.test.ts`, `appVersion.test.ts`, `updateFlow.test.ts`); new real-touch `name-swipe-probe` (21 checks, all 6 cue styles × Set/Submitted) and `sw-update-probe` (old SW → new build on resume, no navigation). 22/22 probes green.
- Release plan shift: privacy & config → v0.32.0, push + Left → v0.33.0.

## 0.30.0 — 2026-10-29 (Asia/Calcutta)

Swipe-confirm styles as a Developer option. Steve t175u ("build ALL proposed swipe confirmations as Developer options"), t3s5 2:15 PM "Lock both. Do the swipe-confirm styles next." Rollback: tag `v0.29.2` / `36c4d5a`.

- **Developer → Swipe confirm** picks the cue shown while a swipe is held: **Blue ring (current, default)** · **A Soft tint** · **B Ghost ✓** (in the mode colour: green Set, purple Submitted) · **C Edge sliver** · **D Trailing wash** (follows your finger) · **B+A** (one row = ghost ✓ only; 2+ rows add a ~7% tint). Steve picks the default; blue stays until then.
- The new styles have no ring, glow or transition, so quick swipes don't strobe: the cue appears on engage and is gone on release in the same frame as the ticks.
- **LOCKED (t3s5, 2:15 PM):** the v0.29.2 Sync status line "Saved on this device · push not set up" and the Developer "Academic year starts" row.
- Tests: unit 117 (+6 `swipeConfirm.test.ts`); new real-touch `swipe-confirm-probe` (6 styles × Set/Submitted, held + quick). Crops Night+Day: `/workspace/sow-mockups/swipeconfirm-mj*` (generator `shot-v0300-swipe-confirm.cjs`).
- Release plan shift: privacy & config → v0.31.0, push + Left → v0.32.0.

## 0.29.2 — 2026-10-29 (Asia/Calcutta)

Sync/merge. Steve t3u: Q-FIX-2 "2. A", Q-FIX-6 "Keep academic year - April to March. Keep dev option.", Q-FIX-7 "Think the best concise way." Rollback: tag `v0.29.1` / `616829a`.

- **Per-tick merge (newer tick wins).** A tick changed on this phone since the last pull is kept; every other tick follows the sheet. One local tick no longer blocks Steve's sheet edits to the rest of the class. Saving now writes only the ticks that changed.
- **One-time migration** of existing ticks on the first pull: ticks untouched since the last pull get a per-tick baseline; ticks edited locally keep winning until they're resolved. No local tick is dropped.
- **Academic year April→March** for sheet dates without a year (28/12 seen in January stays last December). Developer → Sync → **Academic year starts** (default April).
- **Honest push status:** Sync now ends with "Saved on this device · push not set up" and never says "Pushed" (push isn't built yet; the placeholder request is no longer sent).
- **Fix (v0.29.1 regression):** a pull no longer flips "Local dirty" to Yes; sheet writes don't count as local changes.
- Tests: unit 111 (+13: `sync/mergeV2.test.ts` 6, `sync/academicYear.test.ts` 6, dataSafety +1). Mocks Night+Day in `/workspace/sow-mockups` (`yearstart-mj1-*`, `pushstatus-mj1-*`).

## 0.29.1 — 2026-10-29 (Asia/Calcutta)

Data-safety patch. Steve t2u (review agreed) + t3u (Q-FIX answers; Q-FIX-5 "missing classes where tabs fail to load should be confirmed from the source - Google Sheets. That is always the source of truth"). Rollback: tag `v0.29.0` / `f15060a`. No visual change.

- **Sync never deletes a class on a failed load.** A tab that errors (timeout, 500) keeps its class, chips and marks. A class that was pulled before is removed only when Google Sheets itself confirms the tab is gone (missing from the workbook's tab list, or gviz answers with the default-tab fingerprint). Its Submitted ticks are always kept. Demo-only classes (t158u) still clear as before.
- **Undo is cleared after a successful pull**, so ↶ can no longer bring back pre-pull marks over the sheet's data.
- **A pull no longer clears "Local dirty".** Only a successful push clears it.
- **Saves can't be lost:** the 280 ms delayed save keeps one pending save per class (editing class B no longer drops class A's), and flushes immediately when the app is hidden or closed (`visibilitychange`/`pagehide`).
- **Checklist Tools rows** (Pending only, Copy marks, Share, Done) now have a true ≥44px tap height (they were 42px). Invisible slop only, pixel-identical Night + Day.
- e2e: `share-shots` opens Settings → Sharing by route (the sheet's manage link was removed in v0.29.0); `tap-probe` checks Tools rows across their full width.
- e2e: `v029-probe` and `swipe-single-probe` now reset the real IndexedDB (`sow-app`, was `sow`).
- Docs: `AGENTS.md` push rule (t128u/t153u) and prefs key `sow-app.prefs.v1`; `docs/CODE_TRIANGULATION_v0291.md`, `docs/FIX_PLAN_v0291.md`.
- Tests: unit 98 (+8: `sync/dataSafety.test.ts` 5, `demo/persistQueue.test.ts` 3).

## 0.29.0 — 2026-10-29 (Asia/Calcutta)

Steve t170u + t171u. Rollback: tag `v0.28.0` / `8833b96`.

### Haptics — all points, graded strengths (t170u "All")
- Palette: selection 7 ms · light 10 · medium 18 · heavy 30 · success [12,40,12] · error [30,60,30]. Assigned per `HAPTICS_PLAN.md` (A–Z, ticks, swipe engage/extend/commit, roll-drag rows, Select start, Mark/Clear, tick-all, undo/redo, Set↔Submitted, Copy marks, Sync done/failed, back-to-exit toast, Copied/WhatsApp).
- Settings → Appearance → Haptics is now **Off / Light / Normal / Strong** (scales pulse lengths). An old "off" toggle migrates to Off.

### Share sheet (t170u #2, t171u)
- Removed the bottom instructions, the `＋ New` pill and the KGA/KGB prefix toggle (prefix stays in Settings → Sharing).
- New **×** close (44px, muted, Day+Night). The handle has a 28px-tall full-width hit area: **tap closes**, **drag follows the finger** and dismisses past 30% of the sheet or on a fling, else springs back. Tap-outside and Back still close.
- **Date:** Overview card → that card's session date. Checklist Tools → the date on screen; in two-date mode the sheet now shows a **28/10 · 2/11 toggle** (defaults to the first) instead of silently using the first.

### Swipe to check (t170u #3)
- Multi-row extension is now hesitant: the finger must go ≥28px past the start row AND ≥60% into the next row before other rows join; once armed it stays armed. Fast drags fill skipped rows.
- Vertical drags on ✓ columns and names stay pure native scroll with momentum (verified, no ticks).
- The blue pending ring is unchanged until Steve locks a softer option (`SWIPE_CONFIRM_PLAN.md`).

### Overview
- Filter chip tap area is a true 44px. The chip row was being shrunk by the flex column to 31px, which clipped the slop to ~32px.

### Tests
- Unit 90 (haptics palette/scaling, sheet drag, swipe hesitancy). New real-touch `v029-probe` (22 checks); share/haptics probes updated; all 20 probes pass.

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