# FIX PLAN v0.29.1 → v0.30.0 (triangulation-style, PLAN ONLY — not committed)
Base: v0.29.0 `f15060a` (live, hash `index-5x8rKp8r.js`). Source review: "SoW v0.29.0 code review" Page. Steve t2u: "plan out the fixes… if any fix needs my approval, let me know".
Rules honoured: tests first; backup tgz before each release; mock before any visual change; never force-push; only Steve locks.

## (a) No-approval fixes (plain bug fixes, nothing Steve would notice)
| ID | Root cause (verified) | Fix | Traps | Failing test first | Effort |
|---|---|---|---|---|---|
| R4 undo after pull | `lib/undoStack.ts:17` module Map; `clearUndoStacks` (:57) never called; `more/SyncPage.tsx:111` reloads IDB only | Call `clearUndoStacks()` inside `WorkspaceContext.reloadFromIdb` (`demo/WorkspaceContext.tsx:75`) when invoked after pull (param `{afterPull:true}`) | Don't clear on boot-time reload (fine either way, stack empty); canUndo is read at render → bump undoTick | unit `undoStack.test.ts`: "pull clears stacks"; e2e `undo-after-pull-probe.cjs`: tick → Pull (route fixture) → ↶ disabled | XS 0.5h |
| R6 lost debounced write | `WorkspaceContext.tsx:103-115` single `pendingPersist` key + 280ms timer; no `visibilitychange/pagehide` in src | Map<ClassKey,MarksMap> pending; `flushAll()` on timer, `visibilitychange==='hidden'`, `pagehide`; move persist out of setState updater (:160-165) into effect/queue | IDB writes on pagehide may be cut short → keep writes per class in one transaction; StrictMode double-invoke | unit `workspacePersist.test.tsx` (new, RTL-free: export pure `PersistQueue`): A then B within 280ms persists both; hidden event flushes | S 2h |
| R11 side effects in updaters | `WorkspaceContext.tsx:163`, `ChecklistPage.tsx:325` haptic in updater | Compute next outside, then set; haptic after compare | Ordering of rapid pointermoves | unit on PersistQueue (above); haptics probe count unchanged `[7,18,7,7,18]` | XS |
| R5a dirty cleared by pull | `sync/engine.ts:213` `syncDirty: ok ? false : …` | Pull never touches `syncDirty`; only successful real push clears | syncNow captures `dirty` at :311 — keep | unit `syncNow.test.ts`: tick → pullSubjects → `syncDirty` still true | XS |
| R10 e2e wrong DB | `tests/e2e/v029-probe.cjs:12`, `swipe-single-probe.cjs:14` delete `'sow'`; DB is `'sow-app'` (`data/db.ts:26`) | Use `'sow-app'` (export const from `_launch.cjs`) | Probes may have passed thanks to leftover state → re-baseline all 20 | probe asserts `indexedDB.databases()` empty after fresh | XS |
| R12 dead code | `db.ts:52` syncQueue, `useChecklistModel.ts:193` submitted0, `paintPhysics.ts:31` oppositeCol, `selectPhysics.ts:73`, `gviz.ts:118` testSheetReadable, `screens/PlaceholderScreen.tsx`, FAB Sort stub `ChecklistPage.tsx:577` | Remove unused exports/vars; keep syncQueue store (removing needs DB v3 bump) | FAB is default-hidden; removing Sort stub is invisible only if FAB off → leave FAB Sort stub (see Q-FIX-10) | `tsc -b` + existing 90 green | S 1h |
| A11y (imp.9) | tick cells divs `ChecklistPage.tsx:543-556`; ↶↷ no label `:442,445`; toggles `DevPage.tsx:20-27`, Appearance rows aria-hidden span only | `role="checkbox" aria-checked aria-label` on `.sw-check-hit` (no tabIndex change to visuals); `aria-label="Undo/Redo"`; `role="switch" aria-checked` on toggle rows | Don't add focus rings (visual) — use `:focus-visible` only if already styled; screen-reader tap must still go via pointer handlers | e2e `a11y-probe.cjs`: query roles/labels | S 1.5h |
| Docs | `AGENTS.md:5` stale push rule; 04_ARCHITECTURE prefs key wrong (`appPrefs.ts:55` = `sow-app.prefs.v1`); 05 "Left seed" not in code | Update docs | — | — | XS |

## (b) Need Steve (behaviour/data/privacy) — see Q-FIX list
R1 privacy, R2 purge, R3 merge, R5b push wording, R7 year, R8 Apps Script auth, R9 Left, swipe reversal.

### Designs pending approval
- **R2 purge** — cause: `gviz.ts:92-98` any fetch error → `rejected`; `engine.ts:74` stores shrunken `discoveredTabs`; `:207` purge; `:101-117` deletes students/rosterMeta/sessions/marks incl. app-only Submitted. Fix (rec.): never purge after a fetch error (track `errored` separately from `notOnSheet`); keep previous tab if it errored; purge only classes absent in an authoritative `tab-list` OR missing N=2 consecutive syncs; never delete marks with `submitted:true` (archive to `settings.archived`). Tests: `pullMerge.test.ts` "one tab 500 → class kept, Submitted kept"; "tab truly removed twice → purged except Submitted". Trap: Math demo purge (t158u) must still work → demo classes have no engSyncState, purge them freely. Effort S–M 3h.
- **R3 merge** — cause: `persistWorkspace.ts:103-135` writes every roll×date with one `ts` (:131) → `engine.ts:164-166` sees whole class as "local newer". Fix: diff against IDB/prev map, write only changed cells with new `updatedAt`; merge per cell per Q-FIX-2. Tests: `persistWorkspace.test.ts` "tick roll 1 stamps only roll 1"; `pullMerge.test.ts` "local tick roll1 + sheet edit roll2 → roll2 from sheet". Trap: existing IDB data already has class-wide stamps → one-time migration: treat stamps equal to a class-wide ts as not-newer (or reset updatedAt=lastSyncAt on upgrade). Effort S 2–3h.
- **R7 year** — `parseEngLite.ts:88-94`, `:112`, `engine.ts:177-178`. Fix: `inferYear(d,m,now)` choose year in {y-1,y,y+1} nearest to now. Tests: now 2027-01-05, "28/12" → 2026-12-28; now 2026-12-30, "2/1" → 2027-01-02. Trap: markIds change key format? No (ISO date same shape) but existing wrong-year marks need re-key on next pull (first-pull logic). Effort S 1.5h.
- **R5b push** — `engine.ts:272-274` placeholder note; `:279` clears dirty on ok. Fix now: treat bridge as "not ready" until real payload; message wording Q-FIX-7. Full push = R8 + backlog #2 (L).
- **R8 Apps Script** — `SoWSync.gs:4-5` Anyone, `:21-46` no auth, openById any id. Fix: Script Property `SOW_TOKEN`, require `body.token`; lock sheetId to the bound spreadsheet (`getActive()`); app stores token in Sync settings. Test: gs unit not possible → bridge.test.ts sends token; manual curl check. Effort M.
- **R9 Left** — `persistWorkspace.ts:46` hardcodes false; `api.ts:69 setLeft`, `:187 rosterWithLeft` unused. Fix per Q-FIX-8.
- **R1 privacy** — fixtures `src/sync/__fixtures__/*.csv` (since v0.26.0 `9e6819e`), `checklist/demoRoster.ts:24+` names match fixtures, `data/seed.ts:20-21` + `persistWorkspace.ts:95-96` hardcode workbook URL, repo PUBLIC. Fix per Q-FIX-1/3/4. Tests: `fixtures.test.ts` asserts no name from an allow-list of real names / all fixture names come from `SYNTHETIC_NAMES`.

## Releases (order)
| Release | Contents | Approval | Rollback |
|---|---|---|---|
| v0.29.1 data-safety | R4, R5a, R6, R11, R10, docs, R2 (if Q-FIX-5 ok) | (a) + Q-FIX-5 | tag v0.29.0 / f15060a |
| v0.29.2 sync/merge | R3 per-cell + migration, R7 year, R5b wording | Q-FIX-2,6,7 | v0.29.1 |
| v0.29.3 a11y + tidy | a11y roles, R12 dead code | none | v0.29.2 |
| v0.30.0 privacy & config | R1 synthetic fixtures/demo, workbook URL config, repo visibility | Q-FIX-1,3,4 | v0.29.3 |
| v0.31.0 push | R8 token + real SoW_* payload, R9 Left | Q-FIX-7,8 | v0.30.0 |
| (parallel) swipe-confirm Dev styles t175u | after v0.29.1 | already asked | — |
Privacy could jump ahead of v0.29.2 if Steve rates exposure urgent (Q-FIX-1).
Total estimate (a)+v0.29.x: ~2 days incl. probes and dogfood.

## Q-FIX list
- Q-FIX-1 pupil names in public history: A scrub history (filter-repo + force-push; breaks rule 9, needs explicit Steve override, rewrites tags) · B going-forward only (replace with synthetic names; history still holds them) · C make repo private + B. Rec: C (or B+delete-and-recreate repo if he wants history gone, no force push).
- Q-FIX-2 merge: A per-cell newest wins · B sheet always wins (local only Submitted) · C local always wins until pushed. Rec: A.
- Q-FIX-3 repo visibility: A keep public · B private (Pages on a private repo needs a paid GitHub plan; site itself stays public) · C private source repo + separate public deploy repo. Rec: B if on Pro, else C.
- Q-FIX-4 workbook URL: A keep hardcoded · B empty by default, entered once in Settings → Sync · C build-time env (`VITE_SHEET_ID`, still in bundle). Rec: B.
- Q-FIX-5 missing/failed tab: A keep class on error, purge only after 2 authoritative misses, never delete Submitted · B never auto-purge (manual "Remove class") · C current behaviour. Rec: A.
- Q-FIX-6 Dec/Jan year: A nearest-to-today year · B academic-year window (e.g. Jun–May) · C require d/m/yy on sheet. Rec: A.
- Q-FIX-7 push wording until real push: A hide "Pushed", show "Saved on this device · push not set up" · B disable bridge field ("coming soon") · C keep as is. Rec: A.
- Q-FIX-8 Left students: A read `left` from sheet (e.g. name strike/col) · B app-only toggle in Roster (long-press) · C drop feature. Rec: B (mock first).
- Q-FIX-9 Apps Script auth: A shared token in Script Properties + bound sheet only · B "Only myself" + Google sign-in (OAuth, heavier) · C leave stub undeployed. Rec: A when push is built; C until then.
- Q-FIX-10 swipe reversal un-paint + FAB Sort stub: A un-paint on drag-back and remove Sort · B keep both. Rec: OPEN, mock first.

## LOCKED decisions — Steve t3u, 2026-10-29 IST
Steve's note (t3u): "pupil names are already demo in code. We pull real from sync. I'm not on GitHub Pro."
| Q | Lock | Steve's words (t3u) |
|---|---|---|
| Q-FIX-1 | **C**: no history scrub (names in code are demo; real names only arrive via sync); go private later | "1. C" · "pupil names are already demo in code. We pull real from sync." |
| Q-FIX-2 | **A**: newer tick wins, per tick | "2. A" |
| Q-FIX-3 | **C**: private source repo + public deploy-only repo (not on GitHub Pro) | "3. C" · "I'm not on GitHub Pro." |
| Q-FIX-4 | **B**: workbook URL blank by default, entered in Settings → Sync | "4. B" |
| Q-FIX-5 | Never purge on a fetch failure; purge only when the sheet's own tab list (or gviz default-tab answer) confirms the tab is gone; never on uncertainty; Submitted ticks preserved | "I want missing classes where tabs fail to load should be confirmed from the source - Google Sheets. That is always the source of truth." |
| Q-FIX-6 | Academic year April→March, configurable in Developer options | "Keep academic year - April to March. Keep dev option." |
| Q-FIX-7 | Agent's call: concise wording, never claims "Pushed" falsely | "Think the best concise way." |
| Q-FIX-8 | **A + B**, timestamped (sheet Left + in-app toggle; mock toggle first) | "Both A & B. Make it timestamped." |
| Q-FIX-9 | **C** now, **A** (token) when push is built | "9. C + A" |
| Q-FIX-10 | **OPEN — deferred** | "We'll tackle this later... Mark it" |

Status: Q-FIX-5 shipped in v0.29.1 with R4/R5a/R6/R10/docs. Q-FIX-2, 6, 7 shipped in v0.29.2. Next: v0.29.3 (a11y + tidy).

## LOCKED — Steve 2026-10-29 2:15 PM IST (answer t3s5): "Lock both. Do the swipe-confirm styles next."
- Sync status line after Sync now: `… · Saved on this device · push not set up` (v0.29.2, Q-FIX-7). Never "Pushed" unless a real push succeeded. Mocks: `/workspace/sow-mockups/pushstatus-mj1-sync-{night,day}.png`.
- Developer → Sync → **Academic year starts** row (native month picker, default April) (v0.29.2, Q-FIX-6). Mocks: `/workspace/sow-mockups/yearstart-mj1-dev-row-{night,day}.png`.

## Release renumbering (v0.30.0 = t175u swipe-confirm styles, a minor feature)
Privacy & config (Q-FIX-1/3/4) moves to **v0.31.0**; push + Left (Q-FIX-8/9) to **v0.32.0**. v0.29.3 a11y + tidy unchanged.

- **LOCKED (Steve, 2026-10-29 3:13 PM IST, t11s1 "Lock the proposed push hints"):** Sync top hint "…Push not set up yet." · under Sync now "Pulls selected tabs · marks save on this device · push not set up." · About "…push not set up yet." Mocks: `/workspace/sow-mockups/pushhints-mj1-*`.
