# Setting of Work — Sheet mapping (Sync A · locked 2026-10-27 · refreshed v0.26.0 2026-10-29)

**Status:** Locked for Sync A — Eng tabs are source of truth for dates/ticks  
**Workbook id:** `1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw`  
Extract id with: `/spreadsheets\/d\/([a-zA-Z0-9-_]+)/`  
**Aligned with:** app types in `src/db/types.ts`

---

## 1. Eng tabs (roster + Current + ticks)

| classKey   | Sheet tab name |
|------------|----------------|
| KGA_Eng_CW | KGA Eng CW     |
| KGB_Eng_CW | KGB Eng CW     |
| KGA_Eng_HW | KGA Eng HW     |
| KGB_Eng_HW | KGB Eng HW     |

### Layout (live 2026-10-29 · v0.26.0 parser)

| Area | Cells | Meaning |
|------|-------|---------|
| Roster | A=roll, B=name from first row with int roll + name (row **4** on CW/KGA HW, row **2** on collapsed KGB HW) | Upsert students; skip empty names; roll → int |
| Tick columns | C..(Current−1) with ≥1 TRUE/FALSE on roster rows; header row = `Date / Topic` (**no d/m**) | Each tick column = one mark date → app `set` |
| Current | `Date` label under Current (F2), then dates **down** F3, F4… (F4 may sit on first roster row) with topic in G | Drives Overview session + Checklist date pills |
| Collapsed Current | `Current Date 30/9` in header F1, `Topic N n` in G1 | Single Current date; lower `Completed / Date` block is history → ignored |
| PENDING | From col **I** rightward | **Never** read or write |
| Empty col E | spacer before Current | Never a tick column (no TRUE/FALSE) |

**Tick-date rule (v0.26.0):**
1. **Fallback first:** a tick column whose row 2 or header holds a `d/m` date uses it (old layout · KGB HW C=`30/9`).
2. **Primary live rule:** remaining tick columns pair **by ordinal** with remaining Current dates (date1→C, date2→D).
3. Mismatch (ticks without a Current date, or vice versa) → **warning**, pull intersection only, never invent marks.

**Tab discovery (v0.26.0):** gviz returns the **default tab** (HTTP 200) for a missing `sheet=` name. App fingerprints a random missing name and rejects any candidate byte-identical to it (except the real first tab, `KGA Eng CW`). Tab names come from htmlview when reachable, else probing `KG[AB] (Eng|Math|Sci) (CW|HW)`. Sync chips = subjects with ≥1 discovered tab.

**Join key:** `classKey` + `roll` (never name alone).

**Eng ticks = `set` only.** No `submitted` column; `submitted` stays app-local and is **kept** on every pull.

**Live snapshot (2026-10-29, verified pull):**
| Tab | Current | Marks pulled | TRUE |
|---|---|---|---|
| KGA Eng CW | 28/10·Q, 2/11·Q | 88 (44×2) | 32 |
| KGB Eng CW | 28/10·Q, 2/11·Q | 90 (45×2) | 58 |
| KGA Eng HW | 7/10·P p, 14/10·P p | 88 (44×2) | 52 |
| KGB Eng HW | 30/9·N n (collapsed) | 45 (C only; D unpaired → warning) | 40 |
| Math / Sci | — not on sheet (gviz fallback rejected) | 0 | — |

Other tabs: `SoW_Sessions`, `SoW_RosterMeta`, `SoW_Marks` (not pulled yet).

**Roster refresh:** upsert students; never delete `SoW_RosterMeta.left` when a name disappears temporarily.

---

## 2. App-owned tabs `SoW_*` (backup · hide from UI)

Create if missing. Header row = row 1. Booleans `TRUE`/`FALSE`. Dates D/M in UI.

**Hide** these three tabs in the workbook (Sheets `hidden: true`) so Steve only sees Eng tabs; app still reads/writes them as backup.

### `SoW_Sessions`
sessionId, classKey, date1, topic1, date2, topic2, createdAt, updatedAt

### `SoW_Marks`
markId (`classKey|roll|date`), classKey, roll, name, date, topic, set, submitted, updatedAt  
One row per student × date.

### `SoW_RosterMeta`
classKey, roll, name, left, updatedAt

**Left seed (only these unless Steve changes):**
- Ishita Kumari roll **19** — KGA_Eng_CW + KGA_Eng_HW  
- Riyaarth Narayan roll **31** — KGA_Eng_CW + KGA_Eng_HW  
- Rudransh Pandey roll **33** — KGB_Eng_CW + KGB_Eng_HW  

Clear phone demo seed Left on first Sync A (do not re-apply fake Left to real rolls).

---

## 3. Sync A behaviour (locked)

1. **Pull roster** from Eng A:B row 4+.
2. **Pull Current** F3:G4 → session date1/topic1 (+ date2/topic2).
3. **Pull ticks** from scanned date columns → local marks (`set`); stamp import with `sheetSeenAt`.
4. **Hash** Eng tick block + Current block per tab; if hash ≠ last snapshot, update snapshot + `sheetSeenAt`.
5. **Merge:** for each mark, if Eng value changed since last sync → Eng wins unless local `updatedAt` > last successful sync time for that classKey. Unchanged Eng + newer local keeps local until Push (out of Sync A).
6. **Pull/push `SoW_*`** as backup mirror of local sessions/marks/rosterMeta (conflict = higher `updatedAt`).
7. **Hide** `SoW_*` tabs after ensure-exists.
8. **Offline:** queue; flush when online. Sync blocked offline (existing).
9. **Do not write Eng tick/Current columns in Sync A** (Push-to-Eng is a later JB).

### Filters ↔ fields
- Finished / Pending → `set`
- Submitted / Not submitted → `submitted` (app-only until Eng gains a column)
- Hide left → Settings; `SoW_RosterMeta.left`

### Change log (Q-SYNC-3)
App records `{what, when}` for tick / copy / push / pull. Optional while-open poll of Eng hash (PWA cannot poll when asleep).

---

## 4. Later (not Sync A)
- Push to Eng tabs with confirm + undo snapshot  
- Copy date-A checklist → date-B (app)  
- Dual-date slide-to-check (app)  
- Full historical import beyond Current tick columns  

---

## 5. Acceptance (Sync A)
- [x] Eng Current → session dates/topics on Sync  
- [x] Eng TRUE/FALSE columns → `set` marks  
- [x] Merge uses `sheetSeenAt` / last-sync vs local `updatedAt`  
- [ ] `SoW_*` hidden; still round-trip as backup (hide blocked — MCP has no sheet hide; backup pull OK)  
- [x] Demo Left cleared; only seed Left names remain  
- [x] Teaching PENDING / formulas untouched  
