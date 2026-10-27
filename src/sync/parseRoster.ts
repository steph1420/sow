import type { ClassKey, Student } from '../db'
import { studentId } from '../db'

/** Rows: A=roll, B=name. Skip empty names; coerce roll. */
export function parseRosterRows(classKey: ClassKey, rows: string[][]): Student[] {
  const out: Student[] = []
  const seen = new Set<number>()
  for (const r of rows) {
    const roll = Number.parseInt(String(r[0] ?? '').trim(), 10)
    const name = String(r[1] ?? '').trim()
    if (!Number.isFinite(roll) || roll <= 0) continue
    if (!name) continue
    if (seen.has(roll)) continue
    seen.add(roll)
    out.push({ id: studentId(classKey, roll), classKey, roll, name })
  }
  return out
}
