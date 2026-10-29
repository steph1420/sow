# SoW sheet bridge (Apps Script) — schema 1

Bound to the **copy** workbook `1vGXltIwxto-KGZr1ygSDk9EEM0m5rkLySXshZMdv4UQ` only. Layout: `docs/SHEET_LAYOUT_PLAN.md`.

Files: `Code.js` (everything), `appsscript.json` (manifest: Asia/Kolkata, V8, web app = Me / Anyone).
Tests: `npx vitest run apps-script` (mock SpreadsheetApp, demo names only).

## Steve's steps (phone or laptop browser, ~5 min)
1. Open the copy → **Extensions › Apps Script**.
2. Delete what is in `Code.gs`, paste all of `Code.js`. **Project Settings (⚙)** → tick *Show "appsscript.json"* → open it in the editor and paste `appsscript.json`. Save (💾).
3. In the function dropdown pick `menuSetup` → **Run** → allow access (your Google account; "unverified app" → Advanced → Go to project). Back in the sheet a box shows the counts, any dates to check, and the **app token**.
4. **Deploy › New deployment** → type **Web app** → Execute as **Me**, Who has access **Anyone** → Deploy → copy the **Web app URL** (ends in `/exec`).
5. In the app: Settings › Sync → paste the URL into *Apps Script sync URL*, the token into *Bridge token* → **Sync now**.

The sheet's **SoW** menu (reload the sheet once) has *Show app token* and *Remove a subject (backup first)…*.
After editing Code.js later: **Deploy › Manage deployments › ✎ › Version: New** (the URL stays the same).

## clasp alternative
`npm i -g @google/clasp && clasp login` (Steve signs in), copy `.clasp.json.example` → `.clasp.json` with the Script ID from Project Settings, `clasp push`.
