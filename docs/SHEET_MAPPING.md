# Setting of Work — Sheet mapping (JB-5 · locked)

**Status:** Locked for JB-6 sync implementation  
**Aligned with:** app types in `src/db/types.ts` (`v0.4.0`)  
**Workbook:** paste full Google Sheets URL in Settings → store as `settings.sheetUrl`  
**Example id:** `1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw`  
Extract id with: `/spreadsheets\/d\/([a-zA-Z0-9-_]+)/`

---

## 1. Source tabs (read-only roster)

| classKey   | Sheet tab name | Columns | Data rows |
|------------|----------------|---------|-----------|
| KGA_Eng_CW | KGA Eng CW     | A=roll, B=name | from row **4** |
| KGB_Eng_CW | KGB Eng CW     | A=roll, B=name | from row **4** |
| KGA_Eng_HW | KGA Eng HW     | A=roll, B=name | from row **4** |
| KGB_Eng_HW | KGB Eng HW     | A=roll, B=name | from row **4** |

**Rules**
- Join key = `classKey` + `roll` (never name alone).
- Skip empty names; coerce roll to integer.
- **Do not** read or write date/TRUE/FALSE columns, PENDING, Current, or Status on these tabs.
- Roster refresh = upsert students; never delete `SoW_RosterMeta.left` rows when a name disappears temporarily.

---

## 2. App-owned tabs (create if missing)

Header row = row 1, exact column names below. Booleans written as `TRUE` / `FALSE`. Dates displayed as `D/M` (e.g. `14/10`); ISO allowed in storage if needed but UI is `D/M`.

### `SoW_Sessions`
| column | type | notes |
|--------|------|-------|
| sessionId | string | uuid |
| classKey | string | one of four keys above |
| date1 | string | required |
| topic1 | string | |
| date2 | string | empty if unused |
| topic2 | string | empty if unused |
| createdAt | string | ISO |
| updatedAt | string | ISO |

### `SoW_Marks`
| column | type | notes |
|--------|------|-------|
| markId | string | prefer `classKey\|roll\|date` |
| classKey | string | |
| roll | number | |
| name | string | snapshot at write time |
| date | string | equals session date1 or date2 |
| topic | string | |
| set | boolean | setting-of-work tick |
| submitted | boolean | submitted tick |
| updatedAt | string | ISO |

One row per **student × date**. Link to session via `classKey` + `date ∈ {date1, date2}`.

### `SoW_RosterMeta`
| column | type | notes |
|--------|------|-------|
| classKey | string | |
| roll | number | |
| name | string | cache |
| left | boolean | left school / inactive |
| updatedAt | string | ISO |

**Seed Left (apply on first sync if missing):**
- Ishita Kumari — all **KGA_*** keys  
- Riyaarth Narayan — all **KGA_*** keys  
- Rudransh Pandey — all **KGB_*** keys  

---

## 3. Sync behaviour (for JB-6)

1. **Test URL:** parse id; confirm spreadsheet accessible; create any missing `SoW_*` tab with headers.
2. **Pull roster:** teaching tabs → local `students` (upsert).
3. **Pull SoW_*:** sessions / marks / rosterMeta → IndexedDB; conflict = higher `updatedAt` wins.
4. **Push:** local sessions, marks, rosterMeta → `SoW_*` (app history is authoritative going forward).
5. **Offline:** queue mutations; flush when online.
6. **Never** write into the four teaching tabs’ mark columns.

### Filters ↔ fields (unchanged)
- Finished / Pending → `set`
- Submitted / Not submitted → `submitted`
- Date chip → UI column only
- Hide left → Settings UI; persisted `left` in `SoW_RosterMeta`

---

## 4. Out of scope (post JB-6 optional)
- One-time import of old TRUE/FALSE from teaching date columns  
- Mirroring ticks back into KGA/KGB Eng CW/HW columns  

---

## 5. Acceptance (JB-5 done)
- [x] Field names match `src/db/types.ts`  
- [x] Tab names + classKeys documented  
- [x] Left seed names listed  
- [x] Sync order + no-write rule on teaching tabs clear for implementer  
