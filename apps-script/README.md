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

## v0.34.0 update (pairing)
1. Extensions › Apps Script › `Code.gs`: select all, delete, paste the new `Code.js`, Save. Do **not** run setup again.
2. Deploy › Manage deployments › ✎ (edit) › Version: **New version** › Deploy. The `/exec` URL stays the same.

## v0.36.0 update (settings sync)
1. Open the copy sheet › Extensions › Apps Script › `Code.gs` → select all, paste the new `apps-script/Code.js`, Save.
2. Deploy › Manage deployments › ✎ (edit) › Version: **New version** › Deploy. Do **not** make a New deployment (the built-in `/exec` URL must stay the same).
3. Nothing to run: the hidden **Prefs** tab is created on the first settings sync. Columns: key · category · value · updatedAt · deviceId. Don't edit it by hand.
New actions: `prefsPull`, `prefsPush` (token). All older actions unchanged; replies say `version: "0.36.0"`.
