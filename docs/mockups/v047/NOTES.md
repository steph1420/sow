# v0.47.0 mocks — LOCKED (Steve t118u "I liked the mockups. For share, use the bottom version." + t123u toggle)
Re-rendered 2026-11-03 IST with codenames only (ST-01…ST-45; students are never named). Script: `mock.cjs` (renders against https://steph1420.github.io/sow/ v0.46.1 with in-page overlays). 412×915 and 1440×900, Night then Day.

## Locks
- **1 Pending grace (t116u/t118u):** Pending only — a ticked row stays 3 s, dimmed (45%) + struck through, with a draining bar; then fades/collapses (~220 ms). Tapping again cancels. The tick saves immediately. Finger down pauses the collapse.
- **2 Share (t118u):** option **2a** — Quick overview footer row [⤴ Share | Close]. 2b rejected.
- **3 Top panel (t116u/t118u):** overlays the table, decoupled. Nothing moves while the finger is down. After ~120 ms still: hide if net ≥24 px down, show if ≥24 px up or at the top. The table never shifts.
- **4 Push A–Z strip down (t123u):** Developer option, default **OFF** (panel overlays the strip's top). ON: strip sits below the visible panel.
- Timings in `src/config` (grace 3000 ms, settle 120 ms, threshold 24 px, wheel 150 ms); grace/settle/threshold are Developer options too.

Decision log: CHANGELOG 0.47.0-beta.1; agent-common handovers/lfps-sow/DECISIONS.md (LOCKED).
