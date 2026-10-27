/** Higher updatedAt wins; equal keeps local. */
export function pickNewer<T extends { updatedAt: string }>(local: T | undefined, remote: T): T {
  if (!local) return remote
  return remote.updatedAt > local.updatedAt ? remote : local
}

export function mergeByKey<T extends { updatedAt: string }>(
  local: T[],
  remote: T[],
  keyOf: (row: T) => string,
): T[] {
  const map = new Map<string, T>()
  for (const row of local) map.set(keyOf(row), row)
  for (const row of remote) {
    const k = keyOf(row)
    map.set(k, pickNewer(map.get(k), row))
  }
  return [...map.values()]
}
