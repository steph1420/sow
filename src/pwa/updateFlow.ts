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
  /** v0.40.2 (t96u): a desktop tab that stays open and focused never fires visibility/focus — poll too. */
  intervalMs?: number
  setInterval?: (fn: () => void, ms: number) => unknown
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
  const every = d.intervalMs ?? 5 * 60_000
  if (every > 0) (d.setInterval ?? ((fn, ms) => setInterval(fn, ms)))(() => { if (d.doc.visibilityState === 'visible') check() }, every)

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

/** v0.46.0 (t7u): take + confirm the "before update" snapshot, then let the waiting SW activate.
 *  Capped (default 3 s) so a stuck IDB can never keep the phone on an old build ("Stuck in 0.29.0"). */
export async function snapshotThenActivate(
  snapshot: () => Promise<boolean>,
  activate: () => void,
  capMs = 3000,
): Promise<'ok' | 'unconfirmed' | 'timeout' | 'error'> {
  let r: 'ok' | 'unconfirmed' | 'timeout' | 'error'
  try {
    r = await Promise.race([
      snapshot().then((ok) => (ok ? 'ok' : 'unconfirmed') as 'ok' | 'unconfirmed'),
      new Promise<'timeout'>((f) => setTimeout(() => f('timeout'), capMs)),
    ])
  } catch {
    r = 'error'
  }
  activate()
  return r
}

/** Watch a registration for a new SW that has installed and is waiting; gate its activation on the snapshot. */
export function installSnapshotGate(reg: ServiceWorkerRegistration, snapshot: () => Promise<boolean>): void {
  const done = new WeakSet<ServiceWorker>()
  const handle = (w: ServiceWorker | null) => {
    if (!w || done.has(w) || !navigator.serviceWorker.controller) return
    done.add(w)
    void snapshotThenActivate(snapshot, () => w.postMessage({ type: 'SKIP_WAITING' }))
  }
  handle(reg.waiting)
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing
    nw?.addEventListener('statechange', () => { if (nw.state === 'installed') handle(nw) })
  })
}
