# SoW Settings / Developer options

Steve handoff + redesign locks **2026-10-27**. Feel-lab + prefs export. Night tokens default.

## Locked (product)
- Page name: **Checklist** (Mark renamed)
- Nav IA: **3 tabs** — Checklist · Overview · **More** (popup: Roster, History, Settings — not a hub page)
- Overview: flat cards, no drill-in; **no** Upcoming: / Next subtitle
- Calendar: **Cancel + Confirm**; plugs from Checklist date ▾ / cal icon (no “Use xyz”)
- WA template maker: approved (variables; • separators as previously locked)
- Filters chrome direction: **Myntra-style** Sort | Filters floating bar + bottom sheets (+ optional pills)
- “Only letters with kids” → **Hide empty letters**
- Status strip: **omitted** (set count under class selector)

## Settings IA (Android / iOS style)
Settings root → grouped rows → drill-in screens. Heavy knobs live under **Developer options**.

1. Sheet & sync  
2. Checklist  
3. Share (WhatsApp template)  
4. Appearance (Day/Night, Night bold, Day bold, Day high-contrast, Hide Left)  
5. **Developer options** (A–Z physics, Overview filter style A/B/C, undo chrome, date chrome variants, filter UI variants, prefs export)

---

## LOCKED nav / IA
| Item | Spec |
|------|------|
| Tabs | Checklist · Overview · More |
| More | 3-dot popup → Roster, History, Settings (scrim; not a hub page) |
| Mark → Checklist | Routes + copy renamed |
| Overview entry | Flat session cards on the tab; tap expands in place (no Enter / detail page) |
| Calendar entry | Checklist date ▾ or cal icon under date → Cancel + Confirm |

## LOCKED Checklist chrome
| Item | Spec |
|------|------|
| Set count | Under class selector |
| Calendar icon | Under date selector |
| Topic | Same quiet label+accent aesthetics; truncate **only when long**; tap → toast (full topic) + **pencil** → edit input (current value) + **X** clear |
| Undo / Redo | **Icons only** (default), under date / right of Topic; **per-class stacks**; Dev: Icons \| Icons+label |
| Set \| Submitted | Always visible |
| Search | Icon → expand |
| Filters | Myntra floating Sort\|Filters + bottom sheets; list must clear FAB (no clipped last row) |
| Status strip | Omitted |
| A–Z | Thin idle on Checklist; physics via Dev (`az.*`) |

## LOCKED Overview
| Item | Spec |
|------|------|
| Filter row | One row sliding `{classes} \| {dates}` |
| Selected style default | **Soft shade (B)** |
| Dev filter styles | **A** Underline · **B** Soft shade · **C** Bold+color |
| Card line | `Mon 10 · 15/44 · topic…` (middot); ring % |
| Topic | Truncate only when long; expand → full topic wraps **own line** (do **not** invent a “Topic” label in card values) |
| Expanded actions | Set/Submitted status + **Open Checklist** + **Share** |

## LOCKED Share
- WA template maker approved; format with • separators / variables as previously locked.

---

## Dev · A–Z scrubber
| Key | Control | Notes |
|-----|---------|-------|
| az.mode | Single · Fisheye | |
| az.hideEmpty | on/off | Hide empty letters |
| az.widenOnPress | on/off | |
| az.pressWidth | px (e.g. 26→48) | Idle stays thin, all letters+∗ |
| az.pressFont | px | All letters bump while held (may clip — OK) |
| az.focusFont | px | Focused letter size |
| az.fe.strength | 0–100 | Curve steepness |
| az.fe.push | 0–100 | Neighbors **push away** (no overlap) |
| az.fe.relative | 0–100 | Neighbor size vs focus |
| az.fe.count | 1–5 | Letters each side in fisheye |

Thumb maps to rail length / viewport; off-screen letters fine.

## Dev · Checklist chrome
| Key | Control |
|-----|---------|
| filter.default | None · Pending · Letter |
| filter.showPending / Letter / Sort / Search | on/off |
| filter.ui | Bar+sheets (Myntra) · Popover · Chips |
| date.ui | Quiet line · Tiny chips · Filters-only · Slim bar · Dual cards |
| status.mode | Hidden · w/ date · In date control *(product default: Hidden — counts under class)* |
| undo.chrome | **icons** · iconsLabel *(default **icons**)* |

## Dev · Overview + appearance
| Key | Control | Default |
|-----|---------|---------|
| overview.filterStyle | underline · **shade** · boldColor | **shade** |
| appearance.nightBold | on/off | off |
| appearance.dayBold | on/off | off |
| appearance.dayHC | on/off | off |

---

## Prefs export (Revanced / Morphe style)
Developer options → **Export preferences** → plain text block Steve pastes to Kiwi:

```
sow.prefs.v1
az.mode=fisheye
az.widenOnPress=true
az.pressWidth=48
az.pressFont=12
az.focusFont=22
az.fe.strength=70
az.fe.push=80
az.fe.relative=55
az.fe.count=2
az.hideEmpty=false
filter.default=pending
filter.ui=myntra
date.ui=quiet
status.mode=hidden
undo.chrome=icons
overview.filterStyle=shade
appearance.nightBold=false
appearance.dayBold=false
appearance.dayHC=false
…
```

Import later optional.
