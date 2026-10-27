# SoW PWA — bugs & known edges (JB-7)

## Open
- **iOS install:** no `beforeinstallprompt`; user must Share → Add to Home Screen (hint shown once).
- **Theme-color vs OS:** status bar follows `theme-color` meta; switching Day/Night updates it, but installed PWAs may need relaunch for chrome tint.
- **gviz pull:** needs link-view (or broader) sharing on the workbook; editor-only private sheets fail Test until shared or pushed via bot connector.
- **Connector push:** device Sync without Apps Script URL is pull-first; create/push SoW_* is bot-side (`user-Google-sheets`) unless Sync Web App URL is set.
- **Left seed names:** matched by substring (Ishita / Riyaarth / Rudransh); a future same-first-name student could false-positive until joined by roll from sheet.

## Fixed / mitigated
- Day theme submit purple now uses `--submit-fg` (readable on light surfaces).
- Offline: banner + Sync blocked with clear message; local marks still write to IndexedDB.
- Empty Mark → link to Session for that class.
