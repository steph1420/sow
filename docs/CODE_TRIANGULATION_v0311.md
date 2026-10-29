# Code triangulation — v0.31.1 tidy, 2026-10-29 IST
- a11y: `a11y-probe` failed on 4 unnamed controls in `ChecklistPage.tsx` (date pills, ↶ ↷) → aria-label/aria-pressed. No visual change.
- setState side effect: `WorkspaceContext.setMarksForClass` called `flushPersist` inside the `setMarksByClass` updater. Now resolves from `marksRef` (synced by effect + updated synchronously), sets state with a pure updater, then schedules the save. Trap: a reload landing between a reload's setState and its effect could be overwritten for one class — same exposure as before (the old updater also used `prev`), covered by reload/offline probes.
- Dead code via knip: `src/sync/bridge.ts`, `seedDemoMarks`, `toDdMm`, `selectedCount` (no references outside their files).
