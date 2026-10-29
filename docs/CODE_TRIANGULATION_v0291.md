# CODE TRIANGULATION v0.29.1 — data-safety (Steve t2u, t3u; 2026-10-29 IST)
Base v0.29.0 `f15060a`. Rollback: tag `v0.29.0` / `f15060a`. Plan: `docs/FIX_PLAN_v0291.md`.

| ID | Root cause (file:line at v0.29.0) | Fix | Trap | Test written first |
|---|---|---|---|---|
| R4 | `lib/undoStack.ts:17` module Map; `clearUndoStacks` (:57) never called after `SyncPage.tsx:111` reload | `engine.ts` pullTabs calls `clearUndoStacks()` on an ok pull | Clear only on ok pull (failed pull keeps history) | `sync/dataSafety.test.ts` "a successful pull clears undo history" |
| R5a | `engine.ts:213` `syncDirty: ok ? false : …` inside pull | Pull no longer writes `syncDirty`; only a successful push clears it (`engine.ts` pushLocal) | `syncNow` reads `dirty` before pulling — unchanged | "pull does not clear syncDirty" |
| R6 | `demo/WorkspaceContext.tsx:103-115` one `pendingPersist` key + one timer; no `pagehide`/`visibilitychange` handler in src | `demo/persistQueue.ts` per-class Map (latest wins), 280 ms; `flushAll` on `pagehide` and `visibilitychange→hidden` | Persist reads rosters/dates via refs at write time; StrictMode double updater only re-schedules the same payload (idempotent) | `demo/persistQueue.test.ts` (3) |
| R2 / Q-FIX-5 | `gviz.ts:92-98` any fetch error → rejected; `engine.ts:74` stored the shrunken list; `:207` purge; `:101-117` deleted all stores incl. app-only Submitted | Discovery reports `errored` and `confirmedMissing` (absent from the sheet's own tab list, or gviz answered with the default-tab fingerprint). Errored tabs keep their previous entry. A class ever pulled (`engSyncState`) is purged only if its tab is in `confirmedMissing`; its Submitted marks are kept. Never-pulled demo classes (t158u Math) still purge | Probe mode (htmlview CORS-blocked) relies on the fingerprint; a 500/timeout is never confirmation; `hasRoll`-rejected tabs are not confirmation | "tab that fails to load is kept…" (probe + tab-list), "tab list confirms the tab is gone → purged, Submitted preserved" |
| R10 | `tests/e2e/v029-probe.cjs:12`, `swipe-single-probe.cjs:14` deleted IDB `sow`; real DB `sow-app` (`data/db.ts:26`) | Delete `sow-app` | Re-run all 20 probes to re-baseline | probes themselves |
| Docs | `AGENTS.md:5` stale push rule; handover 04 prefs key | Rewritten | — | — |

Out of scope (later releases per FIX_PLAN): per-tick merge (Q-FIX-2), academic year (Q-FIX-6), push wording (Q-FIX-7), Left (Q-FIX-8), privacy/config (Q-FIX-1/3/4), Apps Script (Q-FIX-9), swipe reversal (Q-FIX-10 deferred).
