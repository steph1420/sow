# SoW PWA — bugs & known edges (JB-7)

## Open
- v0.46.0 Stable: the LIVE bridge moved to a new deployment. A phone with a **Developer bridge override** set to the old LIVE URL keeps using it on purpose (overrides are never rewritten). Clear the override in Settings › Developer. If the new deployment is a separate script with its own token, phones must pair again. Same script, new deployment = same token, nothing to do. Still open: B-B4-1 (two tabs).
- **Break-it runs (t23u/t24u/t29u), fixed in bridge 0.46.2, waiting for Steve's TEST paste:**
  - B-0462-1 A replayed or late push could be stamped up to 10 min in the future (clientNow offset plus the 10-min clamp slack), so real edits lost until then. Fix: `capShifted_` never lets a shifted stamp pass server time.
  - B-0462-2 `dateFromIso_` rolled impossible dates over (2027-02-30 → 2 Mar; 31 Apr, month 13, month 0; rename/delete too). Fix: the date must read back with the same year, month and day.
  - B-0462-3 Topics starting with `=` were written as formulas (`=1+1` → "2"; formula injection risk), and a leading `'` was eaten. Fix: `plainText_` prefixes an apostrophe.
  - B-0462-4 Ticks for rolls not on the Roster (999), fractional (1.5) or huge (1e9) were stored. Fix: whole number and present on that class's Roster (same rule as roster ops). Note: ticks for a pupil deleted from the Roster sheet are now rejected and shown as a sync note.
  - B-0462-5 An object topic was stored as "[object Object]"; status "Gone" was counted as applied (stored Active). Fix: rejected.
  - B-0462-6 `SOW_TOMBS` grew without limit (Script Property limit 9 KB, about 150–200 renames/deletes before struct pushes would fail). Fix: drop entries older than 60 days, keep the newest 120. Trade-off: an op from a phone offline for more than 60 days could bring back a deleted date.
  - Test-only tombstones (2026-12-25/26, 2027-02-30→03-02, 2027-03-31/04-01, 2026-12-31, 2027-01-01, 2027-04-31→05-01, …) are harmless (they only block ops stamped before the delete). 0.46.2 drops them after 60 days.
- **B-B4-1 (open, found t29u, already in v0.45/beta.3, not a beta.4 regression): two tabs or windows of the app can undo each other's ticks.** Tab 1 ticks a cell. Tab 2 still holds the old grid in memory, and its next save (`persistWorkspace`) diffs the whole class grid against IndexedDB, then writes the old value back with a newer stamp. Repro: `ADV_GROUPS=two-tabs node tests/adv/browser-adv2.cjs`. Proposed fix (needs Steve's ok): save only the cells this tab changed (a dirty set), and/or have other tabs reload marks over a BroadcastChannel on each save. One phone with the PWA open once isn't affected.
- beta.3 → beta.4 client: a bridge reply without state threw outside the error path (FIXED in beta.4, `src/sync/badReply.test.ts`).
- v0.45.0: "Before update" snapshot was best-effort (fixed in v0.46.0-beta.1, see Fixed). Snapshots are device-local (not on the sheet). FIXED first bridge pull keeping a stale seed tick (left TEST at 217; reset to 216).
- v0.44.5: FIXED date popover heavy green fill (t57u → option A), past-view header strip untinted, Connections showing the Beta URL (now masked when not editing), stale probes v040/sync-flow/offline-sync/sw-update/v042-shots. sync-flow/offline-sync now need SOW_TEST_BRIDGE_TOKEN and run on Beta against the TEST copy only.
- v0.44.4: FIXED t56u 2-date view showing one column after the v0.44.3 heal (stored pair [x,x] collapsed). Healed pair is now filled with the nearest date and saved. The 0.43 rule "other column's date collapses to one" is replaced by a swap.
- v0.44.3: FIXED t55u header columns multiplying / deleted date stuck in header. Persisted pairs are healed at render time (stored value rewritten next time a date is picked).
- v0.44.0 Beta: bridge 0.44.0 (rename/delete + tombstones) is written and unit-tested but **not deployed** — moved/deleted dates stay queued on the device until Steve pastes Code.js and deploys a New version (LIVE and TEST copy each need it). Tombstones live in Script Properties `SOW_TOMBS` (grows by one entry per move/delete; fine for a school year). Beta needs the TEST copy's own token (Settings › Sync on Beta). (v0.44.5: Connections URL masked; past header strip tinted; v040-probe fixed. v039-dogfood still stale.)
- v0.43.0 Beta (addressed in 0.44.0 once bridge is deployed): moved/deleted sessions are local only. Moved marks reach the sheet as ticks on the new date + clears on the old date, but the old Sessions row/column stays on the sheet and can come back after a Sync pull until the bridge supports `renameSession` / `deleteSession` (Code.js change, TEST copy first). A deleted session is hidden on this device only. 1|2 default stays 2 dates (one-date-first default for other teachers not switched yet). Tapping, in column 2, the date already in column 1 collapses to one date (v0.42 rule). Old Dates sheet (dates chip) is still there alongside the popover. Stable/Beta switch still label only.
- v0.42.0 Beta: fixed Dates sheet not scrolling on phones, Date 1 never replaceable, picked date resetting on reload, added older dates losing dot/topic after Sync. Topic and Add session edits still reach the sheet only on the next Sync. Stable/Beta switch not built yet (label only).
- v0.41.0: a date added with "Add session" exists only on this device until the next Sync. A picked date is kept for the current run only and resets to the sheet dates on reload. (Year wrap fixed in v0.43.0.)
- v0.36.1 clock guard covers clocks that are *ahead*; a phone that is *behind* can still lose to older-looking stamps until v0.37.0 (op log). Needs Steve's Code.js paste to take effect.
- v0.36.0 settings sync needs Steve to re-paste Code.js + New version; not yet verified on the copy sheet. Device clocks decide newer-wins. `hideLeft` in IDB settings is unused by the UI and not synced. Choosing Not now on the first-join sheet turns settings sync off on that device (turn it back on in Sync).
- v0.35.0 themes: on a cold start the Default palette shows for a moment until IndexedDB loads the saved theme. Mode keeps the existing Day/Night phone pickers (mock showed plain rows). A few secondary tints (Submitted mode, Overview bars) keep their fixed colours by design.
- v0.34.1: the bridge address is built into the bundle; if Steve redeploys as a *new* deployment (new /exec id) the app needs a release or the Developer override. Re-deploying a New version of the same deployment keeps the URL.
- v0.34.0 pairing/ping need Steve to re-paste Code.gs and deploy a New version; until then Pair/Join/Import say "Bridge is older · re-paste Code.gs…".
- Pairing: one active code per bridge (a second Pair a device replaces the first). Setup file holds the token in plain text — anyone with the file can sync; reset the token to revoke.
- Swipe pending cue: **v0.46.0-beta.1** trailing wash is the default (Steve t5u "I like trailing wash"). A device whose prefs already store `blue` (saved or synced from the sheet's Prefs tab) keeps blue until changed in Developer → Swipe confirm.
- Clock: **v0.46.0 bridge** shifts every pushed stamp by (server − phone) when the phone is off by > 30 s (app sends `clientNow`). Only after Steve deploys Code.js 0.46 on a sheet; on bridge 0.44 the old behaviour remains (future stamps clamped, a slow phone can still lose). Limit: a phone whose clock was changed between the edit and the sync is corrected by the offset at sync time.
- Bridge: subjects on the sheet that the app does not model yet (anything outside KGA/KGB Eng/Math CW/HW keys) are skipped with a note — dynamic subjects in the app are a follow-up.
- Submitted (Q-SHEET-1 closed by Steve t5u: keep it). v0.46.0: shown Submitted = manual OR Set; manual flag syncs as Ticks!J `subManual` on bridge 0.46 (bridge 0.44: stays on the phone). Derived vs manual look identical in the grid (no mock yet — open question). Ticks!J stays aligned on bridge rewrites; a hand sort of only columns A–H on the sheet would misalign J.
- v0.46.0 bridge: a push writes only changed Ticks rows (in place + append) and Sessions/Roster only when they changed; a Ticks tab with blank gap rows falls back to the old full rewrite. Rename/delete date and Remove subject still rewrite the tab (structure change).
- Left read-back fixed in v0.46.0 (`loadWorkspaceFromIdb` forced `left:false`; setting Left also never woke auto-save). Q-FIX-8 A+B mock toggle still later.
- Swipe reversal un-paint done in v0.46.0 (path highlight, back un-lights, back to start cancels). FAB Sort stub: Q-FIX-10 still deferred.
- **iOS install:** no `beforeinstallprompt`; v0.35.1 adds Settings › App › Install as app (Share → Add to Home Screen steps sheet) and a one-time nudge. (Before v0.35.1 this line claimed a hint existed — it did not.)
- **Theme-color vs OS:** status bar follows `theme-color` meta; switching Day/Night updates it, but installed PWAs may need relaunch for chrome tint.
- **gviz pull:** needs link-view (or broader) sharing on the workbook; editor-only private sheets fail Test until shared or pushed via bot connector.
- **Connector push:** device Sync without Apps Script URL is pull-first; create/push SoW_* is bot-side (`user-Google-sheets`) unless Sync Web App URL is set.
- **Hide SoW_* tabs:** Sheets MCP has no `hidden` sheet-properties tool. Tabs exist (SoW_Sessions 1728577063, SoW_RosterMeta 1479427997, SoW_Marks 1921268674) — School Bot / Apps Script `hideSheet()` needed.

## Fixed / mitigated

- t14u correction: the v0.46.0-beta.1 report called "a swipe starting on the name lit nothing" a real bug. It was a regression in this build's own new path code (`stepPath([])`), found and fixed before the release shipped, not an old bug. The Developer **Swipe from name** setting (Off/30/50/70 %, default 50 %) was never the cause and its behaviour is unchanged: `name-swipe-setting-probe.cjs` gives the same 16/16 on v0.45.0 and v0.46.0-beta.1.

- v0.46.0-beta.1 (t7u): "before update" snapshot was best-effort (page reloaded before it was written). New builds now wait (workbox skipWaiting off); the page writes the snapshot, reads it back, then sends SKIP_WAITING (3 s cap so an update can't get stuck).
- v0.46.0-beta.1 (t5u): Left students not synced back to the phone's lists. Root cause: `loadWorkspaceFromIdb` built rosters with `left:false` and ignored rosterMeta; setting Left also never triggered auto-save.

- **t52u (0.44.2)**: after deleting a date, Undo undid that date's ticks but the date never came back. Now delete/move are single undo steps that restore date + topic + ticks, also after Sync.
- Known (pre-existing, not 0.44.2): v040-probe has 3 FAILs (topic toast, Tick all/Untick all) on 2a750a4 too — likely date-stale probe, to check.
- v0.40.2 (t96u): **desktop still a narrow column after v0.40.1.** The phone column (max 560 px) was only scaled ×height/640 and never widened, so laptop windows kept wide empty margins on every route. Desktop windows (landscape, ≥1000 px) now fill the width and scale by height/600. Open tabs also poll for updates every 5 min. e2e `wide-fill-probe`.
- v0.40.1 (t95u): **UI not scaling on desktop screens.** The scale used the phone height (915 px) as reference, so any window shorter than 915 px inside the browser (most laptops, 1440×900, 1920×1080 with browser chrome) got ×1. Landscape windows ≥1000 px wide now scale by height/640 (cap 2). e2e `wide-shots` checks 1280×800, 1440×900, 1920×1080 and 2560×1440.
- v0.40.0 (t85u/t86u/t87u): **Quick overview needed two taps to close** — on the backdrop and on Close. Root cause: opening it by swiping up on the Checklist tab let Chrome treat the swipe as a scroll/fling gesture; Chrome then swallowed the next tap to "stop the fling", so the first tap did nothing. Fix: the tab's swipe-up listener is native and non-passive and calls `preventDefault()` on touchmove (no browser gesture starts); while a sheet is open the page behind it cannot scroll (`html.sheet-open`). All sheets checked (Quick overview, Dates, Tools, More, Shortcuts). e2e `sheet-tap-probe`: real touch with jitter, opens via Tools / swipe-up / O and taps 30 ms later — one tap closes via backdrop and via Close.
- v0.40.0 (t88u): sheet drag lagged the finger for the first ~15 px (Chrome holds back touchmoves inside its slop zone). The sheet grab zone now consumes touchstart (not on buttons/inputs), so the sheet tracks 1:1 from the first pixel.
- v0.38.0 (t71u/t72u/t73u): **stray focus ring with touch on every page** (Checklist row 1 date-1 box on reload, Overview card, More, Settings pages, sheets). Cause: v0.37.0 focus-landing and sheet focus moved focus programmatically regardless of input, and Chrome showed `:focus-visible`. Fix: `<html data-input>` modality — rings only after a real keydown, any pointer/touch hides them; focus-landing on route change and sheet open/close happens only when the last input was the keyboard (otherwise focus is not moved). Column-header highlight follows the same rule. e2e `modality-probe` taps through every page/sheet (no ring), then a keydown shows it, a tap hides it.
- v0.38.0 (t75u): **first Overview card open on reload.** Not caused by v0.37.0 — the active (or first) class card has started expanded since ≤ v0.28 (`expandedId` initial state); the v0.37.0 focus-landing only focused it. Per t75u nothing auto-expands now: all cards start closed, only tap/Enter opens one. e2e: reload, tab navigation and keyboard landing leave every card closed.
- v0.34.0 (t39u): Bridge token field mock + lock done (setuppair-mj1-a-sync) · second device needed URL + token retyped (now Pair / Join / Setup file).
- v0.31.0 (t4u): Settings/About version hardcoded at 0.29.0 · installed PWA resumed from background never picked up new builds (no update check, no clientsClaim).
- v0.29.2: class-wide "local newer" merge (now per tick, migrated without loss) · Dec→Jan year (academic year Apr–Mar) · "Pushed" claimed for a placeholder push · v0.29.1 regression: every pull set Local dirty = Yes.
- v0.29.1: failed tab load could purge a class incl. Submitted ticks (now source-confirmed only, Submitted kept) · undo survived a pull · pull cleared Local dirty · delayed save dropped another class / lost on close · two e2e probes reset the wrong IDB · Checklist Tools rows 42px tall (< 44px), `tap-probe` failing since v0.29.0 · `share-shots` helper tapped the removed `.share-manage`.
- Sync A Eng Current + ticks pull (v0.7.0); demo Left cleared except locked rolls
- Left seeds keyed by classKey+roll (not name-only substring on wrong rolls)
- Day theme submit purple now uses `--submit-fg` (readable on light surfaces).
- Offline: banner + Sync blocked with clear message; local marks still write to IndexedDB.
- Empty Mark → link to Session for that class.

- Alphabet strip overlap on long roster — fixed (v0.6.2)
- A–Z strip too small / scrolled away; stuck in letter mode — fixed (v0.7.1 fixed scrubber + clear)

## Notes for future work
- **Settings IA:** Before redesigning Settings screens, pull complete Android / iOS Settings menu references (hierarchy, nav bars, grouped lists, drill-ins) and match that pattern — Steve 2026-10-28.

## Fixed in 0.16.1
- A–Z strip letter gaps stretched on Checklist scroll: `--az-top` was tracking scrolled header bottom (strip grew; flex slots spaced out). Now scroll-compensated (`headBottom + main.scrollTop`) so vertical letter layout stays stable.
- Shift left (`az.insetRight`) was easy to miss: clarified under Settings → Developer → A–Z physics (also linked from Checklist settings).

## Found on TEST copy bridge run (2026-10-31, bridge 0.44.0)
- FIXED (uncommitted-release, post-v0.44.0): Sync now disabled when the sheet is not link-readable (no tabs discovered) even though the bridge path never needs tabs → `src/sync/syncGate.ts` + test.
- FIXED: delete/rename via UI resurrected the old session on the sheet — the cleared cells (set:false, updatedAt newer than the tombstone) were pushed in the same push as the struct op → `ticksOutsideStructs` filter in `syncViaBridge` + test.
- FIXED v0.44.1: rename pushed a set:false tick for every pupil on the new date (TEST: 2 → 45 rows). Cause: persistClassMarks stored a blank cell per pupil for any new date; moveMarks also carried unticked cells.
- FIXED v0.44.1: date dial ArrowUp went earlier.
- FIXED v0.44.1: new Cancel button caught the trailing click of the touch that opened Edit (250 ms guard).
- OPEN (probe staleness): v044-probe past-date checks (3) and v043-probe end-of-run timeout fail since the date rolled to 1 Nov; identical on fb0ae88, not a regression.
