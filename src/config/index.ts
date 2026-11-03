/** v0.47.0 config module — timings and thresholds live here, not as magic numbers (agent-common 06). */
export const TIMINGS = {
  /** Pending only: a ticked row stays this long before it leaves (t116u/t118u). */
  pendingGraceMs: 3000,
  /** Row fade + collapse after grace. */
  pendingCollapseMs: 220,
  /** Top panel: scroll must be still this long after the finger lifts. */
  panelSettleMs: 120,
  /** Top panel: net movement needed to hide (down) or show (up). */
  panelThresholdPx: 24,
  /** Mouse wheel idle before deciding. */
  wheelIdleMs: 150,
  /** Panel slide. */
  panelSlideMs: 180,
} as const

const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, Math.round(n)))
}
export const clampGraceMs = (v: unknown) => clamp(v, 0, 10000, TIMINGS.pendingGraceMs)
export const clampSettleMs = (v: unknown) => clamp(v, 40, 600, TIMINGS.panelSettleMs)
export const clampThresholdPx = (v: unknown) => clamp(v, 8, 120, TIMINGS.panelThresholdPx)

type Opt = { value: number; label: string }
export const GRACE_OPTIONS: Opt[] = [0, 1500, 2000, 3000, 4000, 5000].map((value) => ({ value, label: value ? `${value / 1000} s${value === 3000 ? ' (default)' : ''}` : 'Off (hide at once)' }))
export const SETTLE_OPTIONS: Opt[] = [80, 120, 200, 300].map((value) => ({ value, label: `${value} ms${value === 120 ? ' (default)' : ''}` }))
export const THRESHOLD_OPTIONS: Opt[] = [12, 24, 40, 64].map((value) => ({ value, label: `${value} px${value === 24 ? ' (default)' : ''}` }))
