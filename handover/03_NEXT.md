# EXACT POINT + NEXT (2026-11-01 12:10 IST)
Last thing Steve asked (t65u): "Why does syncing take so long? It's a few KB." Answer given: latency is Apps Script cold start (1-3s+), reading every tab, per-cell writes, and separate pull→push→ops round trips.
## NEXT 1 — Sync speed (do first, mock/plan → Steve approves → build)
Measure first (timed log per phase, TEST copy). Then: single combined request (pull+push+ops), getValues/setValues batch per tab (no per-cell), read only needed tabs/ranges, return deltas since last sync timestamp, CacheService for roster/sessions, keep auto-save debounce. Bridge change = write+test locally on TEST, Steve deploys.
## Other open
- Steve wants to keep checking Beta before deploying v0.44 Code.js to LIVE.
- v0.45 known limit: "before update" snapshot is best-effort (page reloads). In BUGS.
- Not yet re-verified: v039-dogfood probe, older v04x-shots scripts.
- App's built-in demo list has real-looking names in aria-labels — check every screenshot before sending.
- FUTURE (after stable): sheet editing tab in Steve's old per-class layout (Roll, Name, date/topic checkbox columns, Current/Completed/Status/Pending boxes), driven by an "Update" button (NOT onEdit), detects manually added/changed dates/topics; short, very visual warning (big date, amber/red) when updating a date that already has ticks.
## Locked (only Steve locks)
Date popover = plain list, tap selects; hold/swipe-left edit with EDIT sliding over topic only; "Add Date" pill. Edit/Add = centred popup (edit: date, topic, dials, ✓, Cancel, small 🗑; add: squircle with today + ＋). Dials: tap off-centre value to centre+select. Delete allowed with warning (mark count) + Undo; marks move with date; delete/move = one undo step. 1/2 date choice per device; columns oldest-first; picking other column's date swaps. Selected rows: option A (thin green left bar, green text, ✓, no fill). Overview: collapsed cards only; card → All dates; old dates = AMBER past look, Back restores current. Auto-save A (2s pause, flush on hide, ≤30s), autosave icon (hidden at rest, ring→tick fade, cloud+count offline, amber retry), snapshots (after batches/open/before sync+update, last 50 + 1/day 30 days, Back up now, Settings›Backups, ⋮ Restore snapshot…), restore updates phone AND sheet with "Before restore" undo.
