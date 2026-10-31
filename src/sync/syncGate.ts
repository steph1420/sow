/** v0.44.1: Sync now via the bridge never reads tabs, so a private sheet (no gviz) must not disable it. */
export function canSyncNow(o: { busy: boolean; online: boolean; selected: number; connectedPush: boolean }): boolean {
  return !o.busy && o.online && (o.connectedPush || o.selected > 0)
}
