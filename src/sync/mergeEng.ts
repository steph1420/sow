import type { Mark } from '../db'

/**
 * Sync A mark merge: Eng `set` wins unless local updatedAt is newer than
 * last successful sync for that class. `submitted` always kept from local when present.
 */
export function mergeEngMarks(
  local: Mark[],
  eng: Mark[],
  lastSyncAt: string | undefined,
): Mark[] {
  const map = new Map<string, Mark>()
  for (const m of local) map.set(m.markId, m)

  for (const remote of eng) {
    const cur = map.get(remote.markId)
    if (!cur) {
      map.set(remote.markId, { ...remote, submitted: false })
      continue
    }
    const localIsNewer = !!lastSyncAt && cur.updatedAt > lastSyncAt
    if (localIsNewer) {
      // keep local set/submitted; refresh topic/name from eng if useful
      map.set(remote.markId, {
        ...cur,
        name: cur.name || remote.name,
        topic: cur.topic || remote.topic,
      })
    } else {
      map.set(remote.markId, {
        ...cur,
        name: remote.name || cur.name,
        topic: remote.topic || cur.topic,
        set: remote.set,
        // submitted stays app-local
        submitted: cur.submitted,
        updatedAt: remote.updatedAt,
      })
    }
  }
  return [...map.values()]
}
