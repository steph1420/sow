/** v0.44.1: Sync now via the bridge never reads tabs, so a private sheet (no gviz) must not disable it. */
export function canSyncNow(o: { busy: boolean; online: boolean; selected: number; connectedPush: boolean }): boolean {
  return !o.busy && o.online && (o.connectedPush || o.selected > 0)
}
/** v0.46.0 (t4u): an automatic sync (open / foreground / pull) is skipped when nothing is waiting on this phone and the
 *  last successful sync was under `windowMs` ago. Any change, dirty flag or queued op always syncs. */
export function shouldSkipAutoSync(o: { changes: number; syncDirty?: boolean; queued: number; lastSyncAt?: string; now?: number; windowMs?: number }): boolean {
  if (o.changes > 0 || o.syncDirty || o.queued > 0 || !o.lastSyncAt) return false
  const age = (o.now ?? Date.now()) - Date.parse(o.lastSyncAt)
  return age >= 0 && age < (o.windowMs ?? 60000)
}
