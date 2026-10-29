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
