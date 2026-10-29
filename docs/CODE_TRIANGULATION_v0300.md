# CODE TRIANGULATION v0.30.0 — swipe-confirm styles (Steve t175u; 2026-10-29 IST)
Base v0.29.2 `36c4d5a`. Rollback: tag `v0.29.2` / `36c4d5a`. Plan: handover `SWIPE_CONFIRM_PLAN.md` + `mockups/swipe-confirm-mj*.png`.

## As found (v0.29.2)
- `ChecklistPage.tsx` covered rows get `paint-glow` (`checklist.css` `.sw-row.paint-glow`: 1.5px inset ring + 18px glow) and their boxes `.pending` (blue). Glow set on engage (`onCheckPointerMove`), cleared in the same handler as the commit (`finishPaint`), so cue and ticks change in one React batch.
- Strobe source (plan): the 18px glow blooming on quick swipes. No transitions exist on `.sw-row`, so the new styles only need to avoid glows/rings and stay transition-free.

## Change
| Part | Where | Notes / traps |
|---|---|---|
| Pure model | `checklist/gestures/swipeConfirm.ts` — styles list, `normalizeSwipeStyle`, `pendingFlags`, `pendingRowClass`, `washPercent` | B+A: ghost always, tint only when ≥2 rows covered |
| Pref | `prefs/appPrefs.ts` `gestures.swipeConfirmStyle` default `blue`; unknown stored value → blue | Blue stays default until Steve picks (t175u) |
| Dev selector | `more/DevPage.tsx` A–Z/Gestures card, row "Swipe confirm" + native picker (same pattern as the LOCKED "Academic year starts" row) | Mock: `devsel-mj1-swipe-confirm-row-{night,day}.png` |
| Row cue | `ChecklistPage.tsx`: blue → `paint-glow` + `.pending` (unchanged); others → `pc pc-<cue>` and no `.pending`; `pc-clear` when the swipe will untick | Mode colour via `--mode` (Set `--ok`, Submitted `--sub`) on `.sw-page` |
| D wash | `--wash-x` set directly on covered row elements on pointer move (no React re-render per frame); removed on finish | Gradient ends at the finger |
| CSS | `checklist.css` tail: A tint 7% `--pend`, B ghost ✓ mask in `--mode` at 45%, C 3px sliver `--mode`, D gradient `--mode` 4→13%; `transition: none` | No box-shadow on any new cue → no glow frame |

## Tests written first
- Unit `checklist/gestures/swipeConfirm.test.ts` (6): styles + default, fallback, B+A span rule, one flag per style, row classes, wash %.
- Real-touch e2e `tests/e2e/swipe-confirm-probe.cjs`: 6 styles × Set/Submitted — held swipe (own cue only, mode colour, wash follows finger, no ring/glow, 0s transition, B+A tint joins at 2 rows), commit + cue cleared, quick ~60 ms swipe with per-frame sampling (no ring/glow frame for non-blue), ticks land and cue gone on release. Failed 32 checks before the change.
