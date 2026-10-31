# CODE_TRIANGULATION v0.43.0 Beta — date popover, Add/Edit popup, delete+undo, marks move with date

Locks: t18u (tap header → popover), t25u–t29u (hold OR swipe = edit; Add Date pill; edit = date, topic, dials),
t31u (edit/add close popover → centred popup), t32u (Add = squircles, today first, ＋ right of last; focused one edited),
t33u (swipe EDIT tab covers only the topic; date stays visible), t21u (delete allowed with marks + warning), t34u "Lock it".

| # | Spec | Code | Test |
|---|---|---|---|
| 1 | Header tap → popover list, tap = active date | `chrome/DatePopover.tsx`, `ChecklistPage` `.sw-dh-btn` | e2e `v043-probe.cjs` "tap row sets date" |
| 1b | Long-press / swipe-left → edit; tab over topic only | `DatePopover` row pointer handlers, `.dpo-edit` | e2e "long-press", "swipe-edit date visible" |
| 2 | Popup centred, dim, tap outside cancels | `chrome/DateEditModal.tsx` `.dem-scrim` | e2e "outside cancels" |
| 3 | Add: squircles, ＋, focused edited, ✓ saves all | `DateEditModal` mode add | e2e "add two dates" |
| 4 | Edit: big date, topic, dials, ✓, 🗑 | `DateEditModal` mode edit | e2e "edit moves date" |
| 5 | Delete with marks: warn with real count, snapshot, Undo | `sessionEdit.countMarks/dropMarks`, Workspace `deleteSession/restoreSession` | unit + e2e "delete+undo" |
| 6 | Marks move with date; clash blocks Save | `sessionEdit.moveMarks/clashFor/pairAfterMove`, Workspace `moveSession` | unit + e2e |
| 7 | 1\|2 per device | `sessionEdit.readDateCols`, localStorage `sow.dateCols` | unit |
| 8 | Year bug: Year showed 2025 beside a 2026 date | root cause: `dial.turn('month')` wrapped Dec↔Jan without carrying the year | `dial.test.ts`, `sessionEdit.test.ts` |
| 9 | Touch scroll in popover/popup | `.dpo, .dem { touch-action: pan-y }` (lesson v0.42 `.qo-sheet {touch-action:none}`) | e2e "scroll" |

Bridge: no Code.js change in this pass. Moves/deletes are local (topic edit for new date; old date in `deletedSessions`; marks re-keyed locally
and pushed as marks on the new date). Needed later: `renameSession(subjectKey, from, to)` + `deleteSession(subjectKey, date)` (TEST copy first).
