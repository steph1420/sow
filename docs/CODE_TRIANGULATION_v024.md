# CODE triangulation — v0.24.0 pretty plug

**For:** Steve · coding agents · **Date:** 2026-10-28 (Asia/Calcutta)  
**Lock:** Steve t144u — pretty remocks + TRIANGULATION.md locked; triangulation gate in coding.  
**Rollback:** git tag `v0.23.0` / SHA `eec0375` · tarball `/workspace/sow-backups/sow-pwa-pre-v024-pretty-plug-*`

---

## Wire 1 — Overview accordion (kill promote)

| | |
|--|--|
| **Affordance** | Flat Classes list; tap card header |
| **Does** | `expandedId` expands **that** card in place; one open; tap again collapses |
| **Goes** | Stays on Overview; Open Checklist → set active class + Checklist tab |
| **Expects** | Mid-list Math expand does not jump card to top; stable order |
| **Traps found** | Live `nowMarking`/`others` **promotes** expanded to hero — scroll-jump + “Now marking” lie. Share stub → toast “Share — Sync” (nonsense). No subject tags; CW filter chip stacks third dimension. |
| **KEEP** | SessionCard progress ring tones (soft-green/warn/low); Open Checklist primary; filter All·KGA·KGB + dates |
| **FIX** | Remove promote split; flat `filtered.map`; subject filter Eng·Math; subject tags; omit Share; soft-green selection glow already present |
| **DROP** | Now-marking / Other-classes labels; Share button; CW chip on filter row (tags cover CW/HW) |

## Wire 2 — Multi-subject honesty

| | |
|--|--|
| **Affordance** | Eng·Math filter chips · subject tags on cards · Math sessions in list |
| **Does** | Filter by subject; Math classKeys are real markable sessions |
| **Expects** | Steve who marks Math sees Math, not Eng-only lie |
| **Traps** | `ClassKey` / `pullEng` / “Pull Eng tabs” / Settings “Eng pull” copy; seed only Eng; Roster chips Eng-shaped labels |
| **KEEP** | Eng ClassKeys + sheet tab names for Sync A; `pullEng` internal name OK |
| **FIX** | Add `KGA_Math_CW`, `KGB_Math_HW` (+ labels/rosters/seeds); `subjectOf(key)`; Overview filters; UI copy “subject tabs” |
| **DROP** | Eng-only user-facing Sync/Settings strings |

## Wire 3 — Sync page (Sync now)

| | |
|--|--|
| **Affordance** | Primary soft-green **Sync now**; ghosts Test sheet · Pull only; subject chips = this-run |
| **Does** | Sync now: pull selected subjects (Eng→Eng tabs; Math→Math tabs if readable); push iff Apps Script URL set **and** dirty; else Quiet “saved on device”. Pull only = pull without push. Test = probe. |
| **Expects** | One obvious job; offline-first honesty in lede/micro |
| **Traps** | Equal-weight Test / Pull Eng / Push rows; Eng-only labels; Push as daily peer when bridge blank (scary failure) |
| **KEEP** | probeSheet · pullEng engine · pushLocal · IDB offline-first |
| **FIX** | `syncNow(subjects)` + UI craft; chips Eng·Math·Sci (Sci selected→honest “no Sci tabs yet”); “+ tab” deep-links Subjects |
| **DROP** | Equal Push row on daily path |

## Wire 4 — Settings craft + Appearance

| | |
|--|--|
| **Affordance** | Hero tiles Sync · Appearance · Subjects & sheets; Classroom/System rows; Appearance Night/Day phones |
| **Does** | Navigate; theme prefs; FAB · A–Z entry · Reduce motion |
| **Expects** | ColorOS-soft craft; dual Roster/History OK |
| **Traps** | Brutal text Settings; Soft-green Appearance toggle (confuses brand); Marking-defaults duplicate; A–Z buried only in Dev |
| **KEEP** | Dual Roster/History; Dev under System; FAB default off; A–Z width 42 floor |
| **FIX** | Hero grid; Appearance page with phones; Checklist feel (FAB toggle, A–Z → Dev or note); Reduce motion pref; About row with version |
| **DROP** | Soft-green toggle; Marking-defaults row |

## Wire 5 — Subjects & sheets stub

| | |
|--|--|
| **Affordance** | Settings hero / Sync “+ tab” |
| **Does** | Honest catalog page: lists Eng·Math (demo) · Sci “not on sheet yet”; does not invent forever-catalog on Sync |
| **Expects** | No lie that Sci is live |
| **KEEP** | Sync chips = this-run only |
| **FIX** | SubjectsPage stub with honest copy |
| **DROP** | Fake “add tab” that persists nonsense on Sync |

## Wire 6 — Share omit

Already covered in Wire 1 — **DROP** until real OS share.

## Soft deferred

Checklist-with-no-session empty hint — nice-to-have, not blocking (last `activeClassKey` still works).

---

*End coding triangulation. Implement only KEEP/FIX; never ship DROP stubs.*
