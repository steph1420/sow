# Code triangulation — v0.44.0 Beta

Spec: Overview mocks `/workspace/sow-mocks/overview-v1` (LOCKED: dates-list, 3a amber), Scope B (1-date default, Dates sheet retired, Stable/Beta), Scope C (pt41u "And not done yet part as well": bridge rename/delete).

| Requirement | Code | Unit test | e2e (real touch, `v044-probe.cjs`) |
|---|---|---|---|
| Collapsed cards unchanged, expanded view removed | `overview/SessionCard.tsx`, `OverviewPage.tsx` | — | "no expanded view on Overview"; modality-probe |
| Card / › → All dates, newest first, months, UPCOMING | `overview/AllDatesPage.tsx`, `overview/allDates.ts` `groupAllDates` | `allDates.test.ts` | "All dates newest first", "month headers" |
| No truncation at 412 px; bar + count per row | `.ad-*` in `overview.css` (wrap, `overflow-wrap:anywhere`) | — | "no truncated…", "bar and a count" |
| Swipe ← / hold → EDIT over topic only, reuses v0.43 popup | `AllDatesPage` pointer handlers + `DateEditModal` | — | "swipe ← shows EDIT…", "EDIT opens the v0.43 edit popup", "hold arms EDIT" |
| Add Date pill | `AllDatesPage` `.ad-add` → `DateEditModal mode=add` | — | "Add Date pill present" (+ used to seed 3 dates) |
| Row tap loads the date; past → LOCKED amber 3a | `WorkspaceContext.openPast/closePast/pastView`, `useChecklistModel` `past`, `ChecklistPage` `.past-bar/.past-wm/.sw-page.past` | `isPastDate` in `allDates.test.ts` | "past date → amber bar…", "only the past date" |
| Past stays editable | marks go through the normal `setMarksForClass`/`persistClassMarks` (all dates in the map are persisted) | — | "past date stays editable (tick added)" |
| Back restores exactly (class, pair, 1\|2, ticks) | pills/picked never touched by past view; `closePast()` restores `prevClass` | — | "Back restores…", "Back returns to the class…", "saved 1\|2 choice untouched" |
| New device → 1 date; saved choice kept | `readDateCols(raw, false)` in `useChecklistModel` | `sessionEdit.test.ts` | "fresh device starts on 1-date", "saved "2" keeps 2-date" |
| Old Dates sheet retired | `DatePanelSheet.tsx` deleted; chip / `D` → `DatePopover` (`openPopAt`); `reorderNote` + `.dp-sheet…` CSS removed | `pickDate.test.ts` | "dates chip opens the date popover (no old sheet)"; v040 "D opens the date popover" |
| Stable/Beta really switches data source | `sync/channel.ts` (`syncUrlFor` — Beta never falls back to LIVE), `data/api.ts getSettings`, `data/db.ts DB_NAME = dbNameFor()` | `channel.test.ts` | "channel saved per device = beta", "separate IDBs", "Beta cache does not see Stable queued ops", "back on Stable, cache intact" |
| Beta URL per device, entered in Settings › Sync, nothing hardcoded | `more/DataSourceCard.tsx` (`sow.betaUrl`, validated `/exec`) | `channel.test.ts` | "Beta disabled until…", "Beta URL stored per device" |
| Clear channel indicator | `components/ChannelBadge.tsx` (Overview title, Checklist class, Data source card) | — | "no BETA badge on Stable", "channel indicator shown" |
| Bridge `renameSession` / `deleteSession`, idempotent, refuse existing target | `apps-script/Code.js` `applyStructs_`, tombstones `SOW_TOMBS`, `buried()` in `applyPush_`, returns `structApplied` | `apps-script/test/code.test.ts` "v0.44.0 bridge structs" | not deployed (rule) |
| Client queues ops, sends on Sync, clears on confirm, old bridge keeps them | `sync/structOps.ts` `queueStruct/remainingStructs`; `WorkspaceContext` move/delete/restore → `queue()`; `sync/engine.ts` sends `structs` | `structOps.test.ts` | "delete queued for Sync", "rename queued for Sync", "Sync marked dirty" |
