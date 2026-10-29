# Code triangulation — v0.27.0 (Steve t163u "B. Do it systematically")
Base: v0.26.3 `f289eb8` · backup `/workspace/sow-pwa-backup-v0263-20261029-1108.tgz` · Share restore excluded (mocked separately).
Method per finding: trap list → failing repro test first → fix → regression test → full suite → one commit.

## P0-1 Phantom Submitted after first pull
- Traps: demo dates coincide with sheet dates so "delete dates not on sheet" kept them; merge carried `existing.submitted`; purge was gated on `parsed.marks.length` (empty tab kept all demo). Later pulls must still keep user Submitted.
- Repro test: `pullMerge.test.ts` "P0-1 first pull" — failed on v0.26.3 (demo Submitted survived).
- Fix: `engine.ts` — on first pull for a key (`!engSyncState[key]`) delete all marks for that key, and `submitted=false`; subsequent pulls unchanged (`existing.submitted` kept; covered by existing test).

## P1-1 Reload drops to Overview
- Traps: backStack pushes entries with no URL; reload mid-stack ran an install-time reconcile **before** React mounted (0 layers) → `history.go(-k)` rewound the URL to the guard before the shell read the hash (proved with a debug probe: URL went `#checklist/KGA_Eng_CW` → `/sow/` at t=0). Must stay compatible with base/guard/exit toast and in-app ← buttons.
- Repro test first: `tests/e2e/reload-probe.cjs` (4 FAIL on first run).
- Fix: `src/nav/route.ts` (parse/format `#checklist/<ClassKey>`, `#settings/sync`, …; overlays not encoded) + `route.test.ts`; `backStack.setRouteHash()` mirrors route onto the top entry (push with URL, replaceState after reconcile); install no longer reconciles before mount; AppShell + WorkspaceContext boot tab/stack/class from hash.
- Verified: reload-probe 10/10, back-probe all PASS (exit toast, 2nd back leaves, expiry re-arms, deep links).

## P1-2 Offline Sync wipes tabs
- Traps: `discoverTabs` swallowed every per-tab fetch error → offline looked like "workbook has 0 tabs" and `discoverAndStore` persisted `[]`; Sync page re-discovers on open (also offline); dirty must not flip; must not regress the gviz default-tab fingerprint rejection.
- Repro tests first: `pullMerge.test.ts` "P1-2" ×2 (fetch throws TypeError; `navigator.onLine=false`) — both FAILED on v0.26.3 code.
- Fix: `gviz.ts` `OfflineError` for network-level fetch failures; discovery throws it when every request failed at network level. `engine.ts` `isOffline()` short-circuit + keep previous `discoveredTabs` on OfflineError; probe/sync/pull return `OFFLINE_MESSAGE` without writing settings. `SyncPage` online/offline listener → notice, Sync now / Test sheet / Pull only disabled, no discovery while offline.
- Verified: unit 51/51; `tests/e2e/offline-sync-probe.cjs` 8/8 (incl. offline reload via SW, tabs+chips identical, dirty unchanged, re-enables online).

## P1-3 Tick-all partial looks all-ticked
- Traps: `st !== 'off'` rendered ✓ for partial; tap semantics (partial → tick all) are correct and kept; Tick C stroke craft + Submitted purple lock must hold; screen readers got no state.
- Repro first: `tests/e2e/tickall-probe.cjs` (partial must carry `[data-glyph=dash]` — absent on v0.26.3).
- Fix: `DashMark` (same 2px round stroke as Tick C, currentColor so green/purple modes follow); allbox → `role=checkbox aria-checked=true|mixed|false`, `data-state`, descriptive label.
- Verified: probe 3/3 (partial→dash+mixed; tap → ✓ on; tap → empty off).

## P1-4 Tap targets < 44px
- Traps: bounding boxes lie about hit areas (pseudo slop counts, neighbours' slop steals taps, `overflow-x:auto` rows clip vertical slop); tick-all sits 5px under the tool row and 8px over row 1 — naive slop steals Tools/row taps; sticky block must stay flush (seam lock).
- Repro first: `tests/e2e/tap-probe.cjs` — measures the real contiguous `elementFromPoint` span through each control's centre (≥44×44), Overview/Checklist/Tools/More/Settings/Sync at 412 + 360. v0.26.3: 20+ failures.
- Fix (visuals unchanged except noted): invisible `::after` hit slop (`max(100%,44px)`) on `.ov-f .sw-chip .sw-icon-btn .sw-search-btn .more-back .subj-pill`; checklist tool-row slop biased upward; tick-all slop 44×44 biased up + colhead padding-top 10px (header 10px taller — only visible change); undo/redo `margin-inline:5px` so centres ≥44 apart; `.ov-filters` padding-block room; `.sync-input`, Sync ghosts, Overview card buttons `min-height:44px`.
- Verified: tap-probe PASS for all except items owned by P2-2 (off-screen date chip) and P2-3 (title block) — closed there. seam-probe 0/25 fails, az-tween ~133ms unchanged.

## P1-5 Contrast below AA
- Traps: one `--text-ter` token feeds ~40 selectors across both themes — fix at token level, keep hierarchy (sec > ter); Day `--ok`/`--warn`/`--danger` used as text were 3.1–4.4:1; eyebrow used 0.75α green; gradient icon tiles with white glyphs were 2.1:1; inactive A–Z letters (no names) are WCAG-exempt inactive UI and stay dim (lock: A–Z 42 untouched); Night soft-green Set / Submitted purple locks unchanged.
- Repro first: `tests/e2e/contrast-probe.cjs` — composites real backgrounds (alpha + gradients + opacity), 10 screens × Day/Night, 4.5:1 text (3:1 large), 3:1 icon glyphs. v0.26.3: 20/20 screens failing.
- Fix: Night `--text-ter #5a616c→#868d98` (5.9:1); Day `--text-sec #4f5560`, `--text-ter #8b919c→#666c77` (4.8:1), `--ok #147a3a`, `--sub #5b4bd1`, `--warn #9a5800`, `--danger #c5221f`; eyebrow → `var(--ok)`; icon tile gradients darkened (green/teal/orange/blue/violet + Settings hero tiles).
- Verified: contrast-probe 0 fails (20 screen×theme), screenshots `/workspace/shots-v027/`.

## P2-1 History says "Demo sessions" after a real sync
- Traps: History read Overview's one-card-per-class `sessions`, so date2 vanished; copy was hardcoded; the sheet has no past sessions — must not imply a full history.
- Repro: `tests/e2e/sync-flow-probe.cjs` (fresh profile → live Sync → History) + unit `src/demo/history.test.ts`.
- Fix: `historyFromIdb()` → one row per (class, date), newest first; context `historySessions` (demo before first Sync); copy: "From your sheet · synced <d Mon, HH:mm> · the sheet keeps only each class's current dates, so older sessions aren't listed" vs "Demo sessions until your first Sync"; rows show weekday + DD/MM.
- Verified: unit pass; sync-flow-probe 7 rows (KGA/KGB CW 2/11+28/10, KGA HW 14/10+7/10, KGB HW 30/9); also re-proved P0-1 in UI (Overview: no phantom Submitted after first live sync).

## t165u (TOP PRIORITY, real Android Brave) — Wave A gestures on ✓ columns
- Symptoms: vertical drag on ✓ columns ignored; horizontal swipe shows a ring but release does nothing; horizontal-then-vertical "focuses more rows" but nothing on release.
- Traps / causes found: `.sw-check-hit { touch-action:none }` → browser never pans from ✓ columns (vertical ignored). Paint value was the *start cell's* value copied onto the opposite column only → on an unticked row the swipe painted "false" onto "false" = visibly nothing (ring = paint-glow). Roll column also `touch-action:none` outside select mode. Mouse emulation hid all of this — needs real touch.
- Repro first: `tests/e2e/touch-gesture-probe.cjs` — CDP `Input.dispatchTouchEvent`, Android Chrome UA, isMobile/hasTouch, scroller = `.sw-list-wrap`. On v0.26.3 build: vertical 0→0 FAIL.
- Fix: ✓ cells + roll column `touch-action: pan-y` (roll → `none` only while selecting); axis lock unchanged (≥10px, |dx| ≥ 1.15|dy|) — vertical-first = native scroll (pointercancel → clean cancel, ring cleared), horizontal-first = paint; new `rowSwipeValue()` (toggle of the start row: fully ticked → clear, else tick); release commits every covered row × every visible date in one undo step (`setCellsValue`), `navigator.vibrate` on engage/commit; cancel paths clear glow.
- Verified (real touch, 412×915): vertical drag scrolls 0→441; swipe ticks both dates; roll-drag across 3 rows ticks all; touchcancel leaves no ring; tap toggles only one cell; long-press name (950ms hold) → select bar; roll-drag extends selection to 3; select Clear/Mark work. Unit `rowSwipeValue`. (This also closes the "long-press select / hold-paint / roll-drag" unverified items with real touch.)

## P2-2 Overview date chips: no month, clipped
- Traps: filter keyed on `dayLabel` ("Wed 7") — two dates with the same weekday+day would merge; adding month widens chips (more overflow); vertical slop from P1-4 must survive the mask.
- Repro first: `tests/e2e/ovchips-probe.cjs` (360 + 412) — 6 FAILs on old build.
- Fix: chips keyed by ISO date, label "Wed 28/10", oldest→newest; row stays a horizontal scroller with edge-fade mask classes (`fade-r` / `fade-l`) updated on scroll/resize.
- Verified: ovchips-probe 8/8; tap-probe ignores chips under the fade (reachable by scroll).

## P2-3 Title block is a "Back to Overview" button
- Traps: 331×39 invisible button over the class name/topic — reading taps navigated away; Back stays available via hardware back (backStack) and the Overview tab, so no navigation is lost. Chose "not navigate" per brief.
- Repro first: `tests/e2e/title-probe.cjs` (FAIL on old build: tapping title left Checklist).
- Fix: `.sw-lean-left` is now a plain `div` (cursor default); unused `onGoOverview` prop kept in the type for callers.
- Verified: title-probe 3/3; tap-probe now 0 fails at 412 and 360.

## P2-4 KGB Eng HW undated col D — sticky warning
- Traps: it's a sheet-layout fact (header merged, one Current date), not an app error; the app must not guess a date for those ticks; previous text lived in `lastSyncError` (warn colour) forever and counted as "tab warning(s)".
- Repro first: `pullMerge.test.ts` "P2-4" (lastSyncError contained "no Current date" — FAIL).
- Fix: parser emits `notes` (not `warnings`) for undated tick columns; engine stores `settings.syncNotes` (replaced each successful pull, so it clears itself once the sheet gets a 2nd Current date); Sync page shows a muted `.sync-note` ("col D has ticks but no date under Current · not imported. Add a second Current date on the sheet to bring them in."). Ticks still not imported (decision stays with the teacher).
- Verified: unit 54/54; live sync-flow-probe: no col-D warning, quiet note present.

## Unverified items from dogfood — now attempted
- Empty Checklist "Open Session →" loop: `tests/e2e/empty-probe.cjs` (fresh context + deleteDatabase before boot) → no loop, no errors, history length 4; the UI string no longer exists since v0.22.0. Found + fixed: deep link to a non-sheet class (KGA_Math_CW) showed demo Math → now falls back to a sheet class.
- Long-press select, roll-drag select, hold-paint, Mark/Clear under real touch → touch-gesture-probe PASS. Copy marks + undo → copy-probe PASS.

## Locks kept
More popup · Tick C stroke (DashMark uses the same craft) · Submitted purple (Night unchanged; Day text darkened for AA) · soft-green Set fills · A–Z 42 · sticky block (seam-probe 0/25) · tween (~133ms).

## Final regression run (local preview of release build)
unit 54/54 · seam 0/25 · back 0 · az-tween 133ms · reload 0 · tickall 0 · offline-sync 0 · touch-gesture 0 · ovchips 0 · title 0 · empty 0 · copy 0 · contrast 0 (20 screen×theme) · tap 0 (412 + 360) · sync-flow (live sheet) 0.
