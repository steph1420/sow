# Setting of Work — Sheet mapping (Sync A · locked 2026-10-27)

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

### Layout (same on all four)

| Area | Cells | Meaning |
|------|-------|---------|
| Roster | A=roll, B=name from **row 4+** | Upsert students; skip empty names; roll → int |
| Tick columns | Row **2** = date (D/M), row **3** = topic, row **4+** = TRUE/FALSE | Each non-empty date in row 2 is one mark column → app `set` |
| Current | **F2**=Date label, **G2**=Topic label; **F3/G3** = date1/topic1; **F4/G4** = date2/topic2 when filled | Drive active session |
| PENDING | From col **I** rightward (FILTER lists) | **Never** read or write |
| Empty col E | spacer before Current | Ignore |

**Tick-column scan:** start at **C**, walk right; include columns whose row 2 is a non-empty date; **stop before** Current (col F). Do not treat F:G or I+ as ticks.

**Join key:** `classKey` + `roll` (never name alone).

**Eng ticks = `set` only.** There is no `submitted` column on Eng tabs; `submitted` stays app-local / `SoW_Marks`.

**Live snapshot (2026-10-27):**
- KGA/KGB Eng CW: C=`28/10` D=`2/11` (topic Q)
- KGA Eng HW: C=`7/10` D=`14/10` (topic P p)
- KGB Eng HW: C=`30/9` only (topic N n)

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
- [ ] Eng Current → session dates/topics on Sync  
- [ ] Eng TRUE/FALSE columns → `set` marks  
- [ ] Merge uses `sheetSeenAt` / last-sync vs local `updatedAt`  
- [ ] `SoW_*` hidden; still round-trip as backup  
- [ ] Demo Left cleared; only seed Left names remain  
- [ ] Teaching PENDING / formulas untouched  
