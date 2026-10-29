/**
 * v0.37.0 runtime a11y: dialog focus (move in · trap Tab · Esc dismiss · restore) and widescreen scale.
 * One global installer so every sheet in the app gets the same behaviour.
 */
import { wideScale } from './keyboard'

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function openDialogs(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((d) => d.offsetParent !== null || d.getClientRects().length)
}
export function topDialog(): HTMLElement | null {
  const ds = openDialogs()
  return ds[ds.length - 1] ?? null
}
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
}

export function installDialogFocus(): void {
  const restore = new Map<HTMLElement, HTMLElement | null>()
  const sync = () => {
    document.documentElement.classList.toggle('sheet-open', openDialogs().length > 0)
    for (const d of openDialogs()) {
      if (restore.has(d)) continue
      const prev = document.activeElement as HTMLElement | null
      restore.set(d, prev)
      // t73u: move focus into a sheet only after keyboard input — touch/pointer never get a stray ring.
      if (document.documentElement.dataset.input === 'kbd' && !d.contains(prev)) (focusables(d)[0] ?? (d.tabIndex = -1, d)).focus({ preventScroll: true })
    }
    for (const [d, prev] of [...restore]) {
      if (document.contains(d)) continue
      restore.delete(d)
      if (document.documentElement.dataset.input === 'kbd' && prev && document.contains(prev) && (document.activeElement === document.body || !document.activeElement)) prev.focus({ preventScroll: true })
    }
  }
  new MutationObserver(() => queueMicrotask(sync)).observe(document.body, { childList: true, subtree: true })
  document.addEventListener('keydown', (e) => {
    const d = topDialog()
    if (!d) return
    if (e.key === 'Tab') {
      const f = focusables(d)
      if (!f.length) { e.preventDefault(); return }
      const i = f.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1]!.focus() }
      else if (!e.shiftKey && (i < 0 || i === f.length - 1)) { e.preventDefault(); f[0]!.focus() }
    }
  }, true)
  // Esc fallback (bubble): sheets that don't close themselves are dismissed via their scrim.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    const d = topDialog()
    if (!d) return
    const explicit = d.querySelector<HTMLElement>('[data-dialog-close]')
    const prev = d.previousElementSibling as HTMLElement | null
    const sib = prev && prev.matches('button[class*="scrim"]') ? prev : null
    const scrims = [...document.querySelectorAll<HTMLElement>('button[class*="scrim"]')]
    const target = explicit ?? sib ?? scrims[scrims.length - 1]
    if (target) { e.preventDefault(); target.click() }
  })
}

/** Same phone UI scaled to the viewport (Q-WIDE-1 option i). */
export function installWideScale(): void {
  const apply = () => {
    const s = wideScale(window.innerWidth, window.innerHeight)
    document.documentElement.style.setProperty('--wide-scale', String(s))
    document.documentElement.classList.toggle('wide', s > 1)
  }
  apply()
  window.addEventListener('resize', apply)
}

/**
 * t71u input modality: rings only after a real keydown; any pointer/touch hides them again.
 * <html data-input="kbd|pointer">; starts "pointer" so a reload never shows a ring.
 */
export function installInputModality(doc: Document = document): void {
  const root = doc.documentElement
  root.dataset.input = 'pointer'
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return
    root.dataset.input = 'kbd'
  }, true)
  const ptr = () => { root.dataset.input = 'pointer' }
  doc.addEventListener('pointerdown', ptr, true)
  doc.addEventListener('touchstart', ptr, { capture: true, passive: true })
}

/**
 * t88u: every bottom sheet follows the finger 1:1 from the first pixel when dragged by its grabber/header
 * (top 64 px). Flick (> 0.5 px/ms) or > 30 % of its height closes; otherwise it springs back.
 * Native non-passive touchmove → no browser scroll/fling, so the next tap is never swallowed (t85u–t87u).
 */
export const SHEET_SEL = '.qo-sheet, .sw-tools-sheet, .sw-copy-sheet, .more-pop, .kb-sheet, .sp-sheet' // .share-sheet has its own 1:1 grab (v0.28)
export function closeSheet(sheet: HTMLElement): void {
  const explicit = sheet.querySelector<HTMLElement>('[data-dialog-close]')
  const prev = sheet.previousElementSibling as HTMLElement | null
  const scrim = prev && prev.matches('button[class*="scrim"]') ? prev : null
  const any = [...document.querySelectorAll<HTMLElement>('button[class*="scrim"]')].pop()
  ;(explicit ?? scrim ?? any)?.click()
}
export function installSheetDrag(doc: Document = document): void {
  let st: { el: HTMLElement; y0: number; base: string; h: number; pts: [number, number][]; dragging: boolean } | null = null
  doc.addEventListener('touchstart', (e) => {
    const t = e.target as HTMLElement
    const el = t.closest?.(SHEET_SEL) as HTMLElement | null
    if (!el || e.touches.length !== 1) { st = null; return }
    const y = e.touches[0]!.clientY
    const r = el.getBoundingClientRect()
    if (y - r.top > 64) { st = null; return }
    const base = getComputedStyle(el).transform
    // Consume touchstart on the non-interactive grab zone: Chrome otherwise withholds
    // touchmoves inside its ~15px slop region, so the sheet lagged the finger at first.
    if (e.cancelable && !t.closest('button, a, input, textarea, select, [role="button"], [tabindex]')) e.preventDefault()
    st = { el, y0: y, base: base === 'none' ? '' : base, h: r.height, pts: [[performance.now(), y]], dragging: false }
  }, { passive: false, capture: true }) // non-passive: Chrome otherwise withholds touchmoves inside its ~15px slop, so the sheet lagged the finger
  doc.addEventListener('touchmove', (e) => {
    if (!st) return
    const y = e.touches[0]!.clientY
    const dy = Math.max(0, y - st.y0)
    if (!st.dragging && y - st.y0 > 0) { st.dragging = true; st.el.style.transition = 'none' }
    if (!st.dragging) return
    if (e.cancelable) e.preventDefault()
    st.el.style.transform = `${st.base} translateY(${dy}px)`
    st.pts.push([performance.now(), y]); if (st.pts.length > 6) st.pts.shift()
  }, { passive: false, capture: true })
  const end = () => {
    const s = st; st = null
    if (!s || !s.dragging) return
    const last = s.pts[s.pts.length - 1]!, first = s.pts[0]!
    const v = (last[1] - first[1]) / Math.max(1, last[0] - first[0])
    const dy = Math.max(0, last[1] - s.y0)
    if (dy > s.h * 0.3 || (v > 0.5 && dy > 12)) {
      s.el.style.transition = 'transform 150ms ease-out'
      s.el.style.transform = `${s.base} translateY(${s.h + 40}px)`
      window.setTimeout(() => closeSheet(s.el), 140)
    } else {
      s.el.style.transition = 'transform 260ms cubic-bezier(.2,1.3,.4,1)'
      s.el.style.transform = s.base
      window.setTimeout(() => { s.el.style.transition = ''; s.el.style.transform = '' }, 280)
    }
  }
  doc.addEventListener('touchend', end, true)
  doc.addEventListener('touchcancel', end, true)
}
