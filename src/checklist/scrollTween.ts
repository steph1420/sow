/** Fast retargetable scroll tween for A–Z scrub (v0.26.2). */
export const AZ_TWEEN_MS = 150

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export interface ScrollTween {
  to(target: number): void
  cancel(): void
  readonly active: boolean
}

export function createScrollTween(
  el: { scrollTop: number },
  opts: { duration?: number; now?: () => number; raf?: (cb: FrameRequestCallback) => number; caf?: (id: number) => void } = {},
): ScrollTween {
  const duration = opts.duration ?? AZ_TWEEN_MS
  const now = opts.now ?? (() => performance.now())
  const raf = opts.raf ?? ((cb) => requestAnimationFrame(cb))
  const caf = opts.caf ?? ((id) => cancelAnimationFrame(id))
  let id = 0
  let from = 0
  let target = 0
  let start = 0
  let active = false
  const step = () => {
    const t = Math.min(1, (now() - start) / duration)
    el.scrollTop = from + (target - from) * easeOutCubic(t)
    if (t < 1) id = raf(step)
    else active = false
  }
  return {
    to(next) {
      // Retarget from current position; fresh ease-out keeps it moving (no queue).
      if (active && Math.abs(next - target) < 1) return
      from = el.scrollTop
      target = next
      start = now()
      if (!active) { active = true; id = raf(step) }
    },
    cancel() { if (active) caf(id); active = false },
    get active() { return active },
  }
}
