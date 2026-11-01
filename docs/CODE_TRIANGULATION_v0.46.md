# Code triangulation — v0.46.0 Beta (Steve t4u, t5u, t7u, t8u · 2026-11-01)

Rule (t4u): "dont change what doesn't need to. only optimise what can be optimised without compromising integrity."

| # | Feature (turn) | Where | Test first |
|---|---|---|---|
| 1 | Submitted = manual OR Set (t5u). Stored `Mark.submitted` keeps its old meaning-on-disk and becomes the **manual** flag; displayed Submitted = `submitted \|\| set`. Old data: every stored `submitted:true` becomes manual (no loss, no IDB version bump). Tap toggles manual. Sync: push tick carries `sub` (manual); bridge 0.46 stores it in Ticks!J `subManual` (I is a formula — never written). Pull: `sub` absent (bridge 0.44) ⇒ keep local flag. | `src/data/submitted.ts`, `useChecklistModel.ts`, `bridge.ts`, `engine.ts`, `Code.js` | `submitted.test.ts`, `v046.test.ts` (bridge) |
| 2 | Swipe highlights cells on the path; lift ticks only highlighted; going back un-highlights; back at start cancels (t5u). Trailing wash kept and made default. | `gestures/swipePath.ts`, `ChecklistPage.tsx`, `checklist.css`, `appPrefs.ts` | `swipePath.test.ts`, e2e `swipe-path-probe.cjs` (CDP real touch 412×915) |
| 3 | Left read back into the workspace (BUGS: persistWorkspace.ts). Bridge→IDB rosterMeta already newer-wins; the gap was `loadWorkspaceFromIdb` forcing `left:false`. | `persistWorkspace.ts` | `persistWorkspace.test.ts` |
| 4 | Push writes only changed Ticks rows (in place + append), Sessions/Roster only when changed; full rewrite fallback if a tab has blank gap rows. Client skips auto (not manual) syncs when nothing is dirty and the last sync < 60 s ago. | `Code.js`, `syncGate.ts`, `autoSaveRuntime.ts` | `v046.test.ts` equivalence vs `__fixtures__/Code.v0.44.0.js`; `syncGate.test.ts` |
| 5 | Clock-safe newer-wins (t7u "YES YES"): app sends `clientNow`; bridge shifts every op stamp by server−client offset (when > 30 s) before newer-wins + clamp. | `Code.js`, `engine.ts` | `v046.test.ts` skewed clocks |
| 6 | Dependable "before update" snapshot (t7u): update waits for the snapshot write to be committed (IDB tx complete) before SW skipWaiting/reload, with a 3 s cap. | `pwa/updateFlow.ts`, `main.tsx` | `updateFlow.test.ts` |
| 7 | Bridge URL override in Settings › Developer (t7u "Dev opt"), masked + validated. | `sync/bridgeOverride.ts`, Developer page | `bridgeOverride.test.ts` |
| 8 | Connection check: sheet label (TEST/LIVE by id) + bridge version. | `sync/connectionCheck.ts`, Sync settings | `connectionCheck.test.ts` |
| D | Separate Beta site (t8u): `steph1420/sow-beta`, base `/sow-beta/`, beta flavor defaults to TEST /exec, own IDB `sow-beta`, never touches Stable's channel keys. Stable workflow refuses to deploy a prerelease version. | `vite.config.ts`, `channel.ts`, workflows | `channel.test.ts` |

Degrade on bridge 0.44.0: `sub`/`clientNow` ignored by old bridge (extra JSON fields); app keeps manual Submitted locally; connection check shows the version; old ping lacks sheetId ⇒ label from Settings sheet URL.
