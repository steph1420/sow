# SoW PWA — bugs & known edges (JB-7)

## Open
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
- **iOS install:** no `beforeinstallprompt`; user must Share → Add to Home Screen (hint shown once).
- **Theme-color vs OS:** status bar follows `theme-color` meta; switching Day/Night updates it, but installed PWAs may need relaunch for chrome tint.
- **gviz pull:** needs link-view (or broader) sharing on the workbook; editor-only private sheets fail Test until shared or pushed via bot connector.
- **Connector push:** device Sync without Apps Script URL is pull-first; create/push SoW_* is bot-side (`user-Google-sheets`) unless Sync Web App URL is set.
- **Hide SoW_* tabs:** Sheets MCP has no `hidden` sheet-properties tool. Tabs exist (SoW_Sessions 1728577063, SoW_RosterMeta 1479427997, SoW_Marks 1921268674) — School Bot / Apps Script `hideSheet()` needed.

## Fixed / mitigated
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
