/** v0.41.0 (t102u) — one Contrast value (-1 Softer … 0 Default … +1 Stronger) for Night and Day.
 *  Mixes secondary text, tertiary text and hairlines toward --text (stronger) or --bg (softer).
 *  Accent / ok / tint colours are never touched. Applied on <body> so palette vars on <html> stay the source. */
export const CONTRAST_KEYS = ['--text-sec', '--text-ter', '--hairline'] as const
const AMT: Record<(typeof CONTRAST_KEYS)[number], [number, number]> = { '--text-sec': [40, 35], '--text-ter': [50, 35], '--hairline': [14, 55] }

export function normalizeContrast(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0
  return Math.round(Math.max(-1, Math.min(1, n)) * 10) / 10
}
export function contrastVars(c: number, base: Record<string, string>): Record<string, string> {
  const v = normalizeContrast(c)
  if (!v) return {}
  const out: Record<string, string> = {}
  for (const k of CONTRAST_KEYS) {
    const b = base[k]?.trim(); if (!b) continue
    const [up, down] = AMT[k]
    const p = Math.round(Math.abs(v) * (v > 0 ? up : down))
    out[k] = v > 0 ? `color-mix(in srgb, ${b} ${100 - p}%, var(--text) ${p}%)` : `color-mix(in srgb, ${b} ${100 - p}%, var(--bg) ${p}%)`
  }
  return out
}
/** Re-applies whenever theme / palette changes (MutationObserver on <html>). */
export function installContrast(get: () => number): () => void {
  const root = document.documentElement, body = document.body
  const apply = () => {
    for (const k of CONTRAST_KEYS) body.style.removeProperty(k)
    const cs = getComputedStyle(root)
    const base = Object.fromEntries(CONTRAST_KEYS.map((k) => [k, cs.getPropertyValue(k)]))
    const vars = contrastVars(get(), base)
    for (const [k, val] of Object.entries(vars)) body.style.setProperty(k, val)
    root.dataset.contrast = String(normalizeContrast(get()))
  }
  apply()
  const mo = new MutationObserver((recs) => { if (recs.some((r) => r.attributeName !== 'data-contrast')) apply() })
  mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-palette', 'style', 'class'] })
  return () => mo.disconnect()
}
