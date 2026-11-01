/**
 * v0.46.0 (Steve t5u): "it should also highlight checkboxes as I go past them. Swipe should only check the boxes that get
 * highlighted. This would also allow me to cancel swipe check by going back midway."
 * Pure path model: the path is the ordered list of boxes the finger has passed. Re-entering an earlier box truncates the
 * path there (un-highlight). Lift commits exactly the path, unless it collapsed back to the start (cancel).
 */
import { rollsBetween } from './paintPhysics'

export type PathCell = { roll: number; col: number }
export const cellKey = (c: PathCell) => `${c.roll}|${c.col}`
export const pathKeys = (p: PathCell[]) => p.map(cellKey)

export function stepPath(path: PathCell[], cell: PathCell, order: number[]): PathCell[] {
  const at = path.findIndex((x) => x.roll === cell.roll && x.col === cell.col)
  if (path.length && at === path.length - 1) return path
  if (at >= 0) return path.slice(0, at + 1)
  const last = path[path.length - 1]
  let next = path
  // fast vertical move: fill the rows skipped between the last box and this one, in the new column
  const fill = last && last.roll !== cell.roll ? rollsBetween(order, last.roll, cell.roll).filter((r) => r !== last.roll) : [cell.roll]
  const seq = last && order.indexOf(cell.roll) < order.indexOf(last.roll) ? [...fill].reverse() : fill
  for (const roll of seq.length ? seq : [cell.roll]) next = stepPath1(next, { roll, col: cell.col })
  return next
}
function stepPath1(path: PathCell[], cell: PathCell): PathCell[] {
  const at = path.findIndex((x) => x.roll === cell.roll && x.col === cell.col)
  return at >= 0 ? path.slice(0, at + 1) : [...path, cell]
}

/** dx = finger x − start x; dir = sign of the engaging stroke (+1 right, −1 left). */
export function isCancelled(path: PathCell[], dx: number, dir: number, slop = 12): boolean {
  if (path.length === 0) return true
  if (path.length > 1) return false
  return dx * (dir || 1) <= slop
}

export function cellAt(
  x: number,
  y: number,
  rows: { roll: number; top: number; bottom: number }[],
  cols: { left: number; right: number }[],
  slopX = 4,
): PathCell | null {
  const row = rows.find((r) => y >= r.top && y < r.bottom)
  if (!row) return null
  const col = cols.findIndex((c) => x >= c.left - slopX && x <= c.right + slopX)
  return col < 0 ? null : { roll: row.roll, col }
}
