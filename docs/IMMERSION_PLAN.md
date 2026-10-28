# Immersion pack — remock plan (t145u–t147u)

**For:** Steve · coding agents · **Date:** 2026-10-28 (Asia/Calcutta)  
**Trigger:** Dogfood v0.24.0 + immersion remock review t147u  
**Status:** **LOCKED + PLUGGED v0.25.0** (Steve t149u).  
**Source:** `crops-immersion.html` · shot: `shot-crops-immersion.mjs` · PNGs: `out/immersion-mj1…mj5.png`  
**Keeps:** Portal lean Checklist · Wave A · tick C · FAB off · A–Z 42 · soft-green Set · More popup · pretty Settings craft · no Soft-green Appearance toggle · no fat date-card stack · opaque chrome · lean-title auto-hide · latch-next on empty A–Z letter

---

## 1. KEEP / FIX / DROP

| | Item |
|---|------|
| **KEEP** | Opaque tools + sticky `#`/`NAME` · lean-title auto-hide only · A–Z HUD + urgent scroll · first-child highlight · Appearance air · empty-letter **latch-next-populated** (HUD finger letter dim) · Set soft-green |
| **FIX (t147u)** | Two-date honesty in lean topic · date pills **DD/MM** · focused name **mid-snap** (near-top exception) · **Hide dimmed letters** Checklist-feel option · Submitted → Quiet **purple** · ticks **bottom-aligned** to name column |
| **DROP** | Bare day pills (`28` / `2`) · single-date subtitle when two dates active · soft-teal Submitted · mid-snapping near-top names (creates empty gap) · Soft-green Appearance toggle · neon / blue-select rings |

---

## 2. Submitted color — **Quiet purple `#8b7cf7`**

| Candidate | Why / why not |
|-----------|----------------|
| ~~soft-teal `#34c7b5`~~ | Dropped t147u (“Change teal to purple”) · teal stays Comfort / Reduce-motion icon only |
| **Quiet purple `#8b7cf7` (PICK)** | Existing Quiet Lucid `--violet` · clear vs soft-green Set · not warn/amber · not blue-select |
| soft-amber | Reserved for warn |

**Pair:** Set = `--ok` `#30d158` · Submitted = `--sub` `#8b7cf7`. Modebar · ticks · lean unit · A–Z hi follow active mode.

---

## 3. Two-date honesty

When **two** date pills active:
- Lean topic/date line shows **both**: `… · 28/10 · 2/11` (not `· Wed 28` alone)
- Pills label **complete DD/MM**: `28/10` · `2/11` (not bare `28` · `2`)

One-date mode may keep a single DD/MM pill + matching topic date.

---

## 4. Mid-snap (focused first-child)

**Default (mid-list letter):** scroll so the focused first-child row’s center sits at ~**50%** of the list viewport (under chrome). Drawn in **IMM-MJ1** with dashed mid-line + Farhan glow.

**Near-top exception:** if that first-child is already within ~½ viewport of list start (e.g. letter **A**), keep the natural top pin — first name under col-head, **no** empty gap above. Drawn in **IMM-MJ5**.

**Empty letter:** latch-next-populated (unchanged).

---

## 5. Hide dimmed A–Z letters

Checklist-feel (Appearance) toggle **Hide dimmed letters** — when ON, strip omits letters with no names (no ghost `C`). Remocked ON in MJ1 / MJ5 strip + MJ4 Appearance toggle ON.

---

## 6. Tick alignment

Row grid `align-items: end` · name baseline + checks share bottom padding — ticks sit on the **bottom** of the name column, not floating mid-card.

---

## 7. Auto-hide (unchanged)

**Hides:** `.lean-main` only. **Never:** tools · col-head · A–Z · tabs. Hysteresis ~8–12px.

---

## 8. Remock board

| ID | File | Intent |
|----|------|--------|
| **IMM-MJ1** | `out/immersion-mj1-scrub.png` | Mid-snap F · Farhan center · DD/MM · hide-dimmed · opaque · HUD |
| **IMM-MJ2** | `out/immersion-mj2-header-hide.png` | Title hidden · DD/MM tools stay |
| **IMM-MJ3** | `out/immersion-mj3-submitted.png` | Submitted Quiet purple |
| **IMM-MJ4** | `out/immersion-mj4-appearance.png` | Hide dimmed toggle ON · air |
| **IMM-MJ5** | `out/immersion-mj5-near-top.png` | Near-top A · no mid gap |

---

## 9. Open ambiguity

None this turn (empty-letter latch-next confirmed by silence on t147u).

---

## 10. Reject

~~Plug Pages~~ (done v0.25.0) · teal Submitted · bare day pills · fatten lean · Soft-green Appearance toggle · blue rings

## Tick-all column register (Steve t148u — corrected)

**Misread earlier:** “aligned with bottom columns” was wrongly treated as vertical baseline in-row.
**Actual lock:** tick-all header ✓ must share the **same horizontal grid columns** as body checks.

**Cause in remock:** `.list.pad-az { padding-right: 54px }` without matching colhead inset → tick-all drifted right of body ✓.

**Fix:** `.chrome.pad-az .colhead { padding-right: 54px }` + same `padding-left: var(--pad-list-x)` + shared grid tracks + `.allbox`=`.check` 34×34 + colhead pad = list pad + row pad-x (54+6). Measured tickAll−body Δ ≈ 0–1px.

