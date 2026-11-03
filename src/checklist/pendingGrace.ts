/** v0.47.0 (t116u/t118u): Pending only — a ticked row lingers (dimmed, struck, draining bar) before it leaves. Pure. */
export type GraceMap = ReadonlyMap<number, { start: number; end: number }>

export function startGrace(g: GraceMap, roll: number, now: number, ms: number): GraceMap {
  const n = new Map(g)
  if (ms > 0) n.set(roll, { start: now, end: now + ms })
  else n.delete(roll)
  return n
}
export function cancelGrace(g: GraceMap, roll: number): GraceMap {
  if (!g.has(roll)) return g
  const n = new Map(g)
  n.delete(roll)
  return n
}
export const inGrace = (g: GraceMap, roll: number) => g.has(roll)
export function expiredRolls(g: GraceMap, now: number): number[] {
  return [...g].filter(([, v]) => now >= v.end).map(([r]) => r)
}
export function graceFraction(g: GraceMap, roll: number, now: number): number {
  const v = g.get(roll)
  if (!v) return 0
  return Math.max(0, Math.min(1, (v.end - now) / (v.end - v.start)))
}
