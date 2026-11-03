/**
 * v0.47.0 (t116u/t118u): top panel decoupled from the table (YouTube-comments header).
 * Finger down → frozen. After the scroll is still for settleMs, decide from net movement.
 */
export type PanelDecision = 'hide' | 'show' | 'keep'

export function decidePanel(fromY: number, toY: number, threshold: number): PanelDecision {
  if (toY <= 0) return 'show'
  const d = toY - fromY
  if (d >= threshold) return 'hide'
  if (d <= -threshold) return 'show'
  return 'keep'
}

type Deps = {
  getY: () => number
  onDecide: (d: PanelDecision) => void
  settleMs: () => number
  thresholdPx: () => number
  setTimer?: (fn: () => void, ms: number) => number
  clearTimer?: (id: number) => void
}

export function createPanelSettle(deps: Deps) {
  const setT = deps.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms))
  const clrT = deps.clearTimer ?? ((id) => window.clearTimeout(id))
  let touching = false
  let anchor = deps.getY()
  let timer: number | null = null
  const stop = () => { if (timer != null) { clrT(timer); timer = null } }
  const settle = () => {
    timer = null
    if (touching) return
    const y = deps.getY()
    const d = decidePanel(anchor, y, deps.thresholdPx())
    if (d !== 'keep') anchor = y
    deps.onDecide(d)
  }
  const arm = (ms = deps.settleMs()) => { stop(); timer = setT(settle, ms) }
  return {
    touchStart() { touching = true; stop(); anchor = deps.getY() },
    touchEnd() { touching = false; arm() },
    scroll(ms?: number) { if (!touching) arm(ms) },
    /** Re-anchor without deciding (e.g. A–Z jump start). */
    reset() { stop(); anchor = deps.getY() },
    dispose: stop,
  }
}
