# SoW PWA — bugs & known edges (JB-7)

## Open
- v0.43.0 Beta: moved/deleted sessions are local only. Moved marks reach the sheet as ticks on the new date + clears on the old date, but the old Sessions row/column stays on the sheet and can come back after a Sync pull until the bridge supports `renameSession` / `deleteSession` (Code.js change, TEST copy first). A deleted session is hidden on this device only. 1|2 default stays 2 dates (one-date-first default for other teachers not switched yet). Tapping, in column 2, the date already in column 1 collapses to one date (v0.42 rule). Old Dates sheet (dates chip) is still there alongside the popover. Stable/Beta switch still label only.
- v0.42.0 Beta: fixed Dates sheet not scrolling on phones, Date 1 never replaceable, picked date resetting on reload, added older dates losing dot/topic after Sync. Topic and Add session edits still reach the sheet only on the next Sync. Stable/Beta switch not built yet (label only).
- v0.41.0: a date added with "Add session" exists only on this device until the next Sync. A picked date is kept for the current run only and resets to the sheet dates on reload. (Year wrap fixed in v0.43.0.)
- v0.36.1 clock guard covers clocks that are *ahead*; a phone that is *behind* can still lose to older-looking stamps until v0.37.0 (op log). Needs Steve's Code.js paste to take effect.
- v0.36.0 settings sync needs Steve to re-paste Code.js + New version; not yet verified on the copy sheet. Device clocks decide newer-wins. `hideLeft` in IDB settings is unused by the UI and not synced. Choosing Not now on the first-join sheet turns settings sync off on that device (turn it back on in Sync).
- v0.35.0 themes: on a cold start the Default palette shows for a moment until IndexedDB loads the saved theme. Mode keeps the existing Day/Night phone pickers (mock showed plain rows). A few secondary tints (Submitted mode, Overview bars) keep their fixed colours by design.
- v0.34.1: the bridge address is built into the bundle; if Steve redeploys as a *new* deployment (new /exec id) the app needs a release or the Developer override. Re-deploying a New version of the same deployment keeps the URL.
- v0.34.0 pairing/ping need Steve to re-paste Code.gs and deploy a New version; until then Pair/Join/Import say "Bridge is older · re-paste Code.gs…".
- Pairing: one active code per bridge (a second Pair a device replaces the first). Setup file holds the token in plain text — anyone with the file can sync; reset the token to revoke.
- Swipe pending cue: blue ring still default (Steve t170u "too shouty"); 5 alternatives in Developer → Swipe confirm (v0.30.0) — awaiting Steve's pick.
- v0.33.0 bridge built but **not verified live** (needs Steve to deploy the web app on the copy). Phone and Apps Script clocks decide newer-wins; a phone clock far off could win/lose wrongly.
- Bridge: subjects on the sheet that the app does not model yet (anything outside KGA/KGB Eng/Math CW/HW keys) are skipped with a note — dynamic subjects in the app are a follow-up.
- Submitted column still shown in the app though the sheet has no Submitted (Q-SHEET-1); UI removal needs a mock + lock.
- Ticks table is rewritten on each push/Entry tick (fine for a year of data; revisit past ~50k rows).
- Left students not read back (`persistWorkspace.ts`), Q-FIX-8 A+B timestamped (later, mock toggle first).
- Swipe reversal un-paint + FAB Sort stub: Q-FIX-10 deferred (t3u "We'll tackle this later").
- **iOS install:** no `beforeinstallprompt`; v0.35.1 adds Settings › App › Install as app (Share → Add to Home Screen steps sheet) and a one-time nudge. (Before v0.35.1 this line claimed a hint existed — it did not.)
- **Theme-color vs OS:** status bar follows `theme-color` meta; switching Day/Night updates it, but installed PWAs may need relaunch for chrome tint.
- **gviz pull:** needs link-view (or broader) sharing on the workbook; editor-only private sheets fail Test until shared or pushed via bot connector.
- **Connector push:** device Sync without Apps Script URL is pull-first; create/push SoW_* is bot-side (`user-Google-sheets`) unless Sync Web App URL is set.
- **Hide SoW_* tabs:** Sheets MCP has no `hidden` sheet-properties tool. Tabs exist (SoW_Sessions 1728577063, SoW_RosterMeta 1479427997, SoW_Marks 1921268674) — School Bot / Apps Script `hideSheet()` needed.

## Fixed / mitigated
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
