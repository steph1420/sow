# v0.26.1 — Chrome seam (t154u) triangulation

**Symptom:** row names peek in a ~10px strip between the lean panel and `#/NAME` colhead; colhead sits lower than the panel bottom.

**Root cause (measured, live v0.26.0, 412×915):** colhead was `position:sticky; top:0` *inside* `.sw-list-wrap`, which has `padding-top: var(--pad-list-y)`. The sticky element rests at the scrollport edge + padding, so a constant 10px strip of the scroller (rows) shows between panel bottom (y=100) and colhead top (y=110). The v0.25 `box-shadow` seal only covered *below* the colhead. Every probe frame failed (25/25).

**Fix:** one non-scrolling opaque block `.sw-chrome` = lean panel + colhead bar. Colhead is no longer sticky and no longer in the scroller; rows scroll only in `.sw-list-wrap` beneath. Auto-hide collapses `.sw-lean-main` inside the same box, so colhead is flush by layout at every animation frame — no JS-measured offsets.

**Traps checked**
- *Auto-hide transform:* a separate transform/top on panel vs colhead races; avoided — single flow box, one collapse.
- *Sticky inside overflow container:* sticky resolves against scroller padding → the gap. Removed sticky entirely.
- *iOS/Android toolbar resize:* chrome is a flex-shrink:0 child of a 100%-height page; viewport resize only changes list height, not the seam.
- *Scroll-snap / A–Z mid-snap:* `scrollToRoll` uses wrap-relative rects, unaffected; list no longer contains colhead so mid-snap is slightly more accurate.
- *Register:* `.sw-colhead-bar` mirrors list-wrap horizontal padding (incl. `az-left`), tick-all centres match body checks (±3px at 2.6x DPR; overlay scrollbars on mobile).
- *Sub-pixel:* chrome has solid `--bg`, `contain:paint`, single hairline at its bottom; probe at fractional y (58.5px mid-animation) clean.

**Test:** Playwright 412×915 mobile, slow wheel down/up incl. mid-animation; `elementFromPoint` over the whole span lean-bottom→chrome-bottom must be inside `.sw-chrome`, never `.sw-row`. Before 25/25 fail · after 0/25.
