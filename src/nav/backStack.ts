/**
 * backStack — keeps browser history in lock-step with in-app layers (v0.26.3, Steve t156u).
 *
 * History layout:  [base] [guard d=0] [d=1] … [d=n]
 * Every open in-app layer (Checklist tab, More popup, Settings sub-pages, Tools, Copy, Search)
 * contributes `count` steps. A reconcile pass pushes / go(-k)s so history depth === layer total.
 * Hardware / gesture back (popstate) closes one step at a time, topmost layer first.
 * Landing on [base] = back at root → toast "Press back again to exit", re-push guard;
 * a second back inside the window lets the browser leave.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'

type Layer = { id: number; seq: number; count: number; close: () => void }

const KEY = '__sow'
const EXIT_WINDOW_MS = 2000

let layers: Layer[] = []
let h = 0 // history depth above guard (d of current entry)
let installed = false
let expectPop = 0
let reconcileQueued = false
let armedUntil = 0
let exiting = false
let toastUntil = 0
let seqCounter = 0
let idCounter = 0
let routeHash: string | null = null // P1-1: current screen hash, mirrored onto the top history entry
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function total() {
  return layers.reduce((n, l) => n + l.count, 0)
}

function stateOf(s: unknown): { kind: 'base' } | { kind: 'layer'; d: number } | null {
  if (!s || typeof s !== 'object' || !(KEY in s)) return null
  const v = (s as Record<string, unknown>)[KEY]
  if (v === 'base') return { kind: 'base' }
  if (typeof v === 'number') return { kind: 'layer', d: v }
  return null
}

function urlFor(hash: string) {
  return location.pathname + location.search + hash
}

function push(d: number) {
  if (routeHash == null) history.pushState({ ...(history.state ?? {}), [KEY]: d }, '')
  else history.pushState({ ...(history.state ?? {}), [KEY]: d }, '', urlFor(routeHash))
}

function syncHash() {
  if (routeHash == null || location.hash === routeHash) return
  history.replaceState(history.state, '', urlFor(routeHash))
}

/** P1-1 — app reports its current screen; the top history entry carries it so reload restores. */
export function setRouteHash(hash: string) {
  routeHash = hash
  queueReconcile()
}

function reconcile() {
  reconcileQueued = false
  if (!installed || exiting || expectPop) return
  const t = total()
  if (t > h) {
    while (h < t) push(++h)
  } else if (t < h) {
    expectPop++
    const k = h - t
    h = t
    history.go(-k)
    return // hash synced after the pop lands
  }
  syncHash()
}

function queueReconcile() {
  if (reconcileQueued) return
  reconcileQueued = true
  queueMicrotask(reconcile)
}

function onPop(e: PopStateEvent) {
  const st = stateOf(e.state)
  if (expectPop > 0) {
    expectPop--
    if (st?.kind === 'layer') h = st.d
    queueReconcile()
    return
  }
  if (!st || st.kind === 'base') {
    // Back past the guard at root.
    if (Date.now() < armedUntil) {
      exiting = true
      history.back() // leave the app (previous site / closes standalone PWA)
      // Launched PWA at history index 0: back() is a no-op — try closing the window.
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') window.close()
      }, 250)
      return
    }
    armedUntil = Date.now() + EXIT_WINDOW_MS
    toastUntil = armedUntil
    emit()
    window.setTimeout(emit, EXIT_WINDOW_MS + 30)
    push(0)
    h = 0
    queueReconcile()
    return
  }
  // One (or more) steps back: close topmost layers.
  let steps = Math.max(0, total() - st.d)
  h = st.d
  const ordered = [...layers].sort((a, b) => b.seq - a.seq)
  for (const l of ordered) {
    if (steps <= 0) break
    const n = Math.min(steps, l.count)
    for (let i = 0; i < n; i++) l.close()
    steps -= n
  }
  queueReconcile()
}

export function installBackStack() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const st = stateOf(history.state)
  if (!st) {
    history.replaceState({ ...(history.state ?? {}), [KEY]: 'base' }, '')
    push(0)
    h = 0
  } else if (st.kind === 'base') {
    push(0)
    h = 0
  } else {
    // Reload / bfcache restore mid-stack: app state is fresh, so unwind to guard.
    h = st.d
  }
  window.addEventListener('popstate', onPop)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      exiting = false
      const s = stateOf(history.state)
      if (s?.kind === 'layer') h = s.d
      queueReconcile()
    }
  })
  // P1-1: no reconcile here — on reload mid-stack the app restores its screen from the hash
  // and registers layers first; AppShell's setRouteHash() effect triggers the first reconcile.
}

/** Register `count` back-steps while active; `close` must undo exactly one step. */
export function useBackLayer(count: number, close: () => void) {
  const closeRef = useRef(close)
  closeRef.current = close
  const layerRef = useRef<Layer | null>(null)
  const c = Math.max(0, count)
  useEffect(() => {
    if (c <= 0) {
      layerRef.current = null
      return
    }
    const layer: Layer = { id: ++idCounter, seq: ++seqCounter, count: c, close: () => closeRef.current() }
    const prev = layerRef.current
    if (prev) layer.seq = prev.seq // keep stacking order when only count changes
    layerRef.current = layer
    layers = [...layers, layer]
    queueReconcile()
    return () => {
      layers = layers.filter((l) => l !== layer)
      queueReconcile()
    }
  }, [c])
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useExitToast(): boolean {
  return useSyncExternalStore(subscribe, () => Date.now() < toastUntil)
}

/** test hook */
export function __debugBackStack() {
  return { h, total: total(), layers: layers.length }
}
