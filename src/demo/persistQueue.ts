/**
 * v0.29.1 (t2u) — delayed IDB save. One pending payload per class (latest wins), so an edit
 * to class A is never dropped when class B is edited inside the delay. `flushAll` writes
 * everything now (used on pagehide / visibilitychange → hidden).
 */
export type PersistQueue<K, V> = {
  schedule: (key: K, payload: V) => void
  flushAll: () => void
}

export function createPersistQueue<K, V>(write: (key: K, payload: V) => void, delayMs: number): PersistQueue<K, V> {
  const pending = new Map<K, V>()
  let timer: ReturnType<typeof setTimeout> | null = null
  const flushAll = () => {
    if (timer) clearTimeout(timer)
    timer = null
    const items = [...pending]
    pending.clear()
    for (const [k, v] of items) write(k, v)
  }
  const schedule = (key: K, payload: V) => {
    pending.set(key, payload)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flushAll, delayMs)
  }
  return { schedule, flushAll }
}
