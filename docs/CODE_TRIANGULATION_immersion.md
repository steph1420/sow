# Coding triangulation — Immersion pack (pre-plug, t147u)

**Gate:** Plugged v0.25.0 (Steve t149u). Rollback v0.24.0.  
**Companion:** `IMMERSION_PLAN.md`

---

## Wire A — Opaque chrome + no peek
(unchanged) Solid `--bg` on lean tools + sticky col-head · list clips under · zero glyph peek.

## Wire B — Lean title auto-hide
(unchanged) `.lean-main` only · hysteresis · Quiet ease · respect Reduce motion.

## Wire C — A–Z first-child + urgent scroll + **mid-snap**

| | |
|---|---|
| **Does** | Scrub → HUD + animated scroll · first-child glow · **mid-snap** to ~50% list viewport |
| **Near-top** | If target offset < ~½ viewport height from list top → `scrollTop` pins top (no invented gap) |
| **Traps** | Always centering (empty gap on A) · teleport without ease · empty letter: latch-next · reduce-motion → jump OK · fighting paint/select styles |
| **FIX** | `idealTop = rowCenter - viewport/2` then `clamp(0, maxScroll)` · `.row.az-focus` wash in mode accent |

## Wire D — Submitted Quiet purple

| | |
|---|---|
| **Does** | `--mark-accent` / `--sub` `#8b7cf7` when mode=submitted |
| **Traps** | Leaving teal from prior remock · modebar green while ticks purple · amber warn collision |
| **KEEP** | Set soft-green tick C geometry |

## Wire E — Appearance air + **Hide dimmed letters**

| | |
|---|---|
| **Does** | Checklist-feel toggle hides `.miss` slots on A–Z · redistribute remaining letters (no flex-squish below 11px) |
| **Traps** | Negative margins cutting cards · hide-empty collapsing idle width below 42 · removing `*` |
| **KEEP** | Idle width 42 · letter floor ≥11px · `*` slot |

## Wire F — Two-date honesty

| | |
|---|---|
| **Does** | Topic line lists all active dates as DD/MM · pills show DD/MM |
| **Traps** | Weekday-only (`Wed 28`) when 2 pills on · truncating month · one-date still forcing two slots |
| **Check** | Two pills → topic has both `28/10 · 2/11` |

## Wire G — Tick-all column register (t148u corrected)

| | |
|---|---|
| **Does** | Header ✓ shares **same horizontal grid columns** as body checks |
| **Traps** | Different L/R padding on colhead vs row · baseline-only misread · allbox≠check size |
| **FIX** | Shared `padding: 0 6px 8px 10px` / row `0 6px 0 10px` · 44px tracks · 22×22 boxes |

## Wire G′ — Tick bottom-align (superseded misread)

| | |
|---|---|
| **Does** | Row `align-items: end` · name padding-bottom matches check bottom |
| **Traps** | Centering checks mid-row · col-head allbox not sharing column bottoms · different hit targets |

---

## Nonsense to reject

- Soft-teal Submitted · Soft-green Appearance toggle · auto-hiding tools · amber Submitted · letter-filter A–Z · bare day pills · mid-snap with empty top gap
