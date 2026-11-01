/**
 * v0.45.0: the app's one auto-saver. Each batch: snapshot (auto, skipped if unchanged) → bridge
 * push+pull (only when a bridge + token are set) → 'sow:synced' so the workspace reloads.
 */
import { useSyncExternalStore } from 'react'
import { getSettings } from '../data/api'
import { takeSnapshot } from '../backup/snapshots'
import { createAutoSaver, type AutoSaveState } from './autoSave'
import { OFFLINE_MESSAGE, isOffline, syncViaBridge } from './engine'
import { shouldSkipAutoSync } from './syncGate'

let state: AutoSaveState = { status: 'idle', pending: 0 }
const subs = new Set<() => void>()
let batch = 0

async function run(): Promise<void> {
  const n = batch
  batch = 0
  await takeSnapshot('auto', n ? `after ${n} change${n === 1 ? '' : 's'}` : 'before sync').catch(() => null)
  const s = await getSettings()
  if (!(s.syncUrl.trim() && s.bridgeToken?.trim())) return // local only: saved on this device
  if (isOffline()) throw new Error(OFFLINE_MESSAGE)
  // v0.46.0 (t4u): nothing waiting + synced < 60 s ago → skip this automatic round trip
  if (shouldSkipAutoSync({ changes: n, syncDirty: s.syncDirty, queued: Object.keys(s.topicEdits ?? {}).length + (s.structOps?.length ?? 0), lastSyncAt: s.lastSyncAt })) return
  const r = await syncViaBridge(s)
  if (!r.ok || r.mode !== 'sync') throw new Error(r.message)
  window.dispatchEvent(new CustomEvent('sow:synced', { detail: r }))
}

export const autoSaver = createAutoSaver({
  run,
  onState: (s) => { state = s; for (const f of subs) f() },
})

export function noteChange(n = 1): void {
  batch += n
  autoSaver.notify(n)
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') autoSaver.flush()
}

let installed = false
/** pagehide / hidden → flush now · visible → pull · online → send the queue · app open → snapshot + pull. */
export function installAutoSave(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('pagehide', () => autoSaver.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoSaver.flush()
    else autoSaver.pull()
  })
  window.addEventListener('online', () => autoSaver.online())
  window.addEventListener('sow:flush', () => { void takeSnapshot('auto', 'before update').catch(() => null) })
  void takeSnapshot('auto', 'app opened').catch(() => null).then(() => autoSaver.pull())
}

export function useAutoSaveState(): AutoSaveState {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
}
