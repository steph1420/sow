# Code triangulation — v0.26.0 Sync accuracy (pre-wire gate)

Source: `sow-mockups/SYNC_PULL_DIAG.md` (R1–R8). Decisions locked autonomously (Steve t153u: "plan and proceed").
Locks preserved: Quiet Lucid style · More popup · tick col C · Submitted purple · soft-green Set.

Each wire lists fish traps checked **before** coding, and the guard that ships.

## W1 — Parser: Current ordinal → tick cols (R1, R6)
| Trap | Guard |
|---|---|
| Header `Date / Topic` has no d/m → 0 marks | Current block (rows under `Date` label in Current col, until blank) paired ordinally with tick cols |
| Pair by letter F→C, spacer E counted | Tick col = col in C..Current−1 with ≥1 TRUE/FALSE on roster rows; empty spacer E never qualifies |
| Current date2 sits on first roster row (coincidence) | Scan Current col from `Date` label row down regardless of roster rows; stop at first non-date |
| Collapsed KGB HW (`Current Date 30/9` in header) | Header-embedded Current date accepted; row2/header tick date wins as fallback (C=30/9); D unpaired → warning, no invented marks |
| Count mismatch (3 tick cols, 2 dates) | Pair intersection only + warning in report |
| Topic from tick header text | Topic from Current Topic col (G); header residue only as fallback |
| Old fixture (dates in row 2) | Kept as fallback test |

## W2 — Merge pulls (R4)
| Trap | Guard |
|---|---|
| Full row overwrite wipes `submitted` | `submitted` always kept from existing mark |
| Local tick newer than sheet clobbered | If existing.updatedAt > engSyncState.lastSyncAt (local edit since last pull) and differs → local wins (counted as `kept`) |
| Demo marks survive beside real ones | First pull of a classKey (no engSyncState) deletes that key's marks on dates not in pulled set |
| Pull marks dirty → spurious push | Pulled rows written with sheet stamp; syncDirty cleared only on ok pull |
| No seen stamp | `engSyncState[key] = { hash, sheetSeenAt, lastSyncAt }` |

## W3 — Sessions / Checklist dates off IDB (R2)
| Trap | Guard |
|---|---|
| Fix parser, keep DEMO_SESSIONS | Pull `putSession({sessionId: key|current})`; Workspace builds Overview sessions from IDB |
| Mixed demo + pulled cards (Math demo next to real Eng) | Demo sessions only when **no** pulled session exists at all |
| Checklist dates hardcoded `DEMO_DATES` | `datesFor(classKey)` = session date1/date2, else demo |
| Session with 1 date (KGB HW) | Slot 2 repeats slot 1 (Checklist needs 2 slots; same markKey so no double count) |
| persist uses WORKSPACE_DATES topics | persistClassMarks takes dates param |

## W4 — Tab discovery (R3)
| Trap | Guard |
|---|---|
| gviz 200 for missing tab returns default tab | Fingerprint = CSV of a random nonexistent tab name; any candidate byte-equal is rejected unless it is the real first tab |
| Which tab is "first"? | htmlview tab list when reachable (Node/tests, some browsers); else known first tab `KGA Eng CW` |
| htmlview CORS-blocked on Pages | Fallback to candidate probing (KGA/KGB × Eng/Math/Sci × CW/HW) |
| SoW_* tabs treated as teaching | Only names matching `KG[AB] (Eng|Math|Sci) (CW|HW)` with a known ClassKey are teaching tabs |
| Math copy-of-Eng intentionally | Would be rejected (documented limit) |

## W5 — Sync chips from discovered tabs (R5, t152u)
| Trap | Guard |
|---|---|
| Hardcoded Eng·Math·Sci | Chips = subjects present in `settings.discoveredTabs`, label with tab count |
| Default Math on | Default selection = all discovered subjects |
| Nothing discovered yet | Auto-discover on Sync open when Sheet URL set; hint if none |
| Subjects page claims Math demo | Lists discovered tabs + "not on sheet" for missing known keys |

## W6 — Docs
SHEET_MAPPING refreshed with live snapshot + tick-date rule.

## Still stub after v0.26.0
Push / SoW_* round-trip (bridge placeholder) · SoW_Marks submitted backup pull · year inference (R8: year from pull clock) · Sci/Math ClassKeys only when real tabs appear.
