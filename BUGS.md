# SoW PWA — bugs & known edges (JB-7)

## Open
- **iOS install:** no `beforeinstallprompt`; user must Share → Add to Home Screen (hint shown once).
- **Theme-color vs OS:** status bar follows `theme-color` meta; switching Day/Night updates it, but installed PWAs may need relaunch for chrome tint.
- **gviz pull:** needs link-view (or broader) sharing on the workbook; editor-only private sheets fail Test until shared or pushed via bot connector.
- **Connector push:** device Sync without Apps Script URL is pull-first; create/push SoW_* is bot-side (`user-Google-sheets`) unless Sync Web App URL is set.
- **Hide SoW_* tabs:** Sheets MCP has no `hidden` sheet-properties tool. Tabs exist (SoW_Sessions 1728577063, SoW_RosterMeta 1479427997, SoW_Marks 1921268674) — School Bot / Apps Script `hideSheet()` needed.

## Fixed / mitigated
- Sync A Eng Current + ticks pull (v0.7.0); demo Left cleared except locked rolls
- Left seeds keyed by classKey+roll (not name-only substring on wrong rolls)
- Day theme submit purple now uses `--submit-fg` (readable on light surfaces).
- Offline: banner + Sync blocked with clear message; local marks still write to IndexedDB.
- Empty Mark → link to Session for that class.

- Alphabet strip overlap on long roster — fixed (v0.6.2)
- A–Z strip too small / scrolled away; stuck in letter mode — fixed (v0.7.1 fixed scrubber + clear)
