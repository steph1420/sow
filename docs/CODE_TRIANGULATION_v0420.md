# Code triangulation — v0.42.0 Beta (Dates sheet: scroll + Option A slot targeting + date sync)

Steve turns: t2u (bugs), t4u (assess + propose), t5u "Mock A." (LOCKED Q-DATES-A, 2026-10-31 09:29 IST), t6u "Push first then dogfood".
Mocks: /workspace/sow-mocks/dates-v1/ (A-slot-chips, generator mock.cjs, repro.cjs).

| # | Symptom | Root cause (one line) | Where | Test first |
|---|---|---|---|---|
| 1 | Dates sheet won't scroll on phone; Done / "Back to sheet dates" unreachable | `.dp-sheet` inherits `touch-action: none` from `.qo-sheet` (checklist.css:792), and every `.dp-dial` (incl. read-only Day) is `touch-action: none` | checklist.css | e2e `dates-scroll-probe.cjs` (CDP real touch, 412×915) |
| 2 | Can't choose which date slot the picker changes | `applyPick` always keeps Date 1 and replaces Date 2; a date older than Date 1 silently swaps | pickDate.ts, DatePanelSheet.tsx | unit `pickDate.test.ts` (`retarget`, `reorderNote`) |
| 3 | Picked date resets on reload | `picked` lived only in React state | WorkspaceContext.tsx | unit `pickedPairs.test.ts` (IDB round-trip) |
| 4 | Added older date loses dot/topic after Sync | `stateToApp` keeps only the 2 newest open sessions; once the topic edit is confirmed it leaves `topicEdits`, so the older date is known nowhere locally | bridge.ts, workspaceData.ts | unit `sessionsAll.test.ts` |
| 5 | Empty topic handled differently by addSession vs setTopic | addSession wrote `''` even over an existing session's topic; setTopic ignored empty | WorkspaceContext.tsx, topicEdits.ts | unit `topicEdits.test.ts` |
| 6 | Mock showed Year 2025 with Mon 2 Nov | picker year must come from the targeted date; checked by e2e (select value == targeted ISO year, weekday from real calendar) | DatePicker.tsx | e2e |

Bridge: the push/pull state already returns **all** Sessions rows, so #4 is fixed app-side (`Session.others`). **Code.js change: no.**

Channel (Rule 15): no Stable/Beta switch exists in the repo. v0.42.0 is labelled **Beta** in Settings/About (`APP_CHANNEL`); the switch is still pending.
