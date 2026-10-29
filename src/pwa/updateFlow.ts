/**
 * v0.30.1 (Steve t4u "Stuck in 0.29.0") — keep the installed PWA on the newest build.
 * The SW (generateSW, autoUpdate) already does skipWaiting + clientsClaim. What was missing:
 * the browser only checks sw.js on navigation, and an Android PWA resumed from the background
 * never navigates — so it kept running old JS. Here:
 *  - check for a new sw.js whenever the app comes to the foreground or gains focus;
 *  - when the new SW takes control, flush pending saves and reload onto the new build,
 *    never in the middle of a touch (waits for the finger to lift).
 */
export type UpdateFlowDeps = {
  doc: EventTarget & { visibilityState: string }
  win: EventTarget
  sw: EventTarget
  update: () => unknown
  reload: () => void
  flush: () => void
  /** false on a first install (no previous controller) → nothing to reload onto. */
  hadController?: boolean
  settleMs?: number
}

export function installUpdateFlow(d: UpdateFlowDeps): void {
  const settle = d.settleMs ?? 400
  let pointerDown = false
  let pending = false
  let reloading = false
  const check = () => {
    try {
      void d.update()
    } catch {
      /* offline / no registration — try again next time */
    }
  }
  d.doc.addEventListener('visibilitychange', () => {
    if (d.doc.visibilityState === 'visible') check()
  })
  d.win.addEventListener('focus', check)

  const go = () => {
    if (reloading) return
    if (pointerDown) {
      pending = true
      return
    }
    reloading = true
    d.flush()
    setTimeout(() => d.reload(), settle)
  }
  d.win.addEventListener('pointerdown', () => (pointerDown = true), { capture: true } as AddEventListenerOptions)
  const lift = () => {
    pointerDown = false
    if (pending) {
      pending = false
      go()
    }
  }
  d.win.addEventListener('pointerup', lift, { capture: true } as AddEventListenerOptions)
  d.win.addEventListener('pointercancel', lift, { capture: true } as AddEventListenerOptions)
  // First install: the first controllerchange is just clientsClaim taking the page — nothing to reload onto.
  // Any later change is a new build.
  let controlled = d.hadController !== false
  d.sw.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true
      return
    }
    go()
  })
}
