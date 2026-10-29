# Prefs sync across paired devices — plan (MOCK STAGE, nothing built)

Request: Steve t49u "Now please include prefs sync... Make a paired sync options like browsers have...".
Mocks: `sow-mockups/prefsync-mj1-{a,b}-{night,day}.png` (generator `/workspace/prefsync-mock/gen.cjs`). Status: **awaiting lock**.

## 1. Inventory (as of v0.35.0)
Prefs live in two places today: localStorage `sow-app.prefs.v1` (AppPrefs) and IndexedDB `settings/app`.

| Category | Keys | Store |
|---|---|---|
| Appearance | `palette` (IDB), `theme` Night/Day, `theme.followSystem` | IDB + LS |
| Checklist feel | `chrome.showFab`, `hideLeft` (IDB), `az.hideEmpty` | LS + IDB |
| Gestures | `gestures.nameSwipeFrom`, `gestures.swipeConfirmStyle`, `gestures.swipeSingleRow` | LS |
| Share templates | `share.templates`, `share.defaultId`, `share.includeClassPrefix` | LS |
| Academic year | `sync.yearStartMonth` | LS |
| Developer options | `az.leftSide`, `az.showHud`, `sync.joinUrlOverride` | LS |
| **Never synced (device only)** | `bridgeToken` (comes via pairing), `syncUrl`, `sheetUrl`, `haptics.*` (phone hardware), `chrome.reduceMotion` (accessibility, per device), `share.lastUsedId`, all sync bookkeeping (`lastSyncAt`, `syncDirty`, `bridgeSyncAt`, `engSyncState`, `discoveredTabs`, `mergeV2At`, `seededAt`, `syncNotes`) | |

## 2. How it works
- **Storage on the sheet:** new hidden `Prefs` tab (not _Meta, so _Meta stays human-readable). One row per category: `category | json | updatedAt | deviceLabel`. Created by `ensureTabs_` like the others.
- **Bridge actions (Code.js v0.36.0):** `prefsPull` (token) → all rows; `prefsPush` (token, `{category, json, updatedAt}[]`) → per-category newer-wins under LockService, replies with the winning rows + `version`.
- **App:** each category has a local `updatedAt` stamped when any of its keys changes. Sync now (and every normal bridge sync) runs prefsPush for enabled+changed categories, then applies newer rows from prefsPull. Whole category wins (no per-key merge) — simple and predictable.
- **Toggles (on this device):** master "Sync settings" + one per category. Off = neither send nor apply. Toggle states are device-only themselves (like Chrome).
- **Defaults:** master on after pairing; Developer options off; others on.
- **First join (screen b):** after pairClaim, if the sheet has Prefs rows show "Use synced settings" (default) / "Use this device's settings" / Not now (= sync off until enabled).
- Keys outside the whitelist are ignored on apply (forward-compatible; older app ignores unknown categories).
- Token is never written to the Prefs tab.

## 3. Estimated release size
- App: ~350–450 lines (prefs categories module, per-category stamps, Sync page section, join sheet) + ~25 unit tests, 1 new real-touch probe.
- Apps Script: ~80 lines (Prefs tab + 2 actions) — **Steve must re-paste Code.js and deploy a New version** (same deployment, so the built-in URL stays).
- Gzip bundle growth ≈ +3 KB. One evening; minor version **v0.36.0**.

## 4. Open questions for Steve (Q-PREF-1…7)
1. **Q-PREF-1** Categories OK as mocked (Appearance, Checklist feel, Gestures, Share templates, Academic year, Developer options)?
2. **Q-PREF-2** Night/Day mode: sync it, or keep per device (phone at night vs laptop in day)? Mock syncs it inside Appearance.
3. **Q-PREF-3** Developer options default off for sync — OK?
4. **Q-PREF-4** Haptics + reduce motion never synced — OK?
5. **Q-PREF-5** First join default = "Use synced settings" — OK?
6. **Q-PREF-6** Whole-category newer-wins (a change to one gesture setting sends all gesture settings) — OK, or per-setting?
7. **Q-PREF-7** Store in a hidden `Prefs` tab (recommended) or in `_Meta`?

## 5. Add-on: Install as app (mock `prefsync-mj1-c-install-{night,day}.png`)
- **Where (proposed):** top row of **More**, above Settings (most visible, one tap). Alternative: Settings › App.
- **Android / desktop Chrome & Edge:** keep the `beforeinstallprompt` event; the Install button calls `prompt()`. The row is shown only after the event fires.
- **iOS Safari** (no prompt API): the row opens a 3-step sheet: Share → Add to Home Screen → Add.
- **Hidden** when `display-mode: standalone` (or `navigator.standalone` on iOS), after `appinstalled`, and on browsers with neither the prompt nor iOS Safari (e.g. Firefox desktop).
- Note: BUGS.md mentions a one-time iOS install hint, but the current code has none (no `beforeinstallprompt`/standalone handling in `src`), so this is new.
- Size: ~120 lines + 1 probe; can ship with v0.36.0 or alone as v0.35.1 (no Apps Script change).

### Open questions (install)
8. **Q-INST-1** Location: More › top row (recommended) or Settings › App?
9. **Q-INST-2** Ship it alone first as v0.35.1 (no bridge re-paste), or together with prefs sync in v0.36.0?
10. **Q-INST-3** Also show a one-time "Install SoW" nudge on first open, or only the More row?
