# SoW sheet sync setup (JB-6)

## Pull (works with link-view)
1. Paste the workbook URL in **Settings → Google Sheet URL**.
2. Share the sheet at least **Anyone with the link → Viewer**.
3. Tap **Test**, then **Sync** — pulls roll/name from the four Eng tabs into the phone.

## Round-trip (create `SoW_*` + push)
1. Open the workbook → **Extensions → Apps Script**.
2. Paste `apps-script/SoWSync.gs`, save.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the Web App URL into **Settings → Sync Web App URL**.
5. **Test** then **Sync** — creates `SoW_Sessions` / `SoW_Marks` / `SoW_RosterMeta` if missing and pushes local data.

The bridge **never** writes ticks into the teaching tabs.
