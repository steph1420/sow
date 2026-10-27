import type { ClassKey, RosterMeta, Student } from '../db'
import { studentId } from '../db'

/** Apply locked Left seeds if that student exists and has no meta yet / left false never forced off. */
export const LEFT_SEEDS: { nameIncludes: string; grades: ('KGA' | 'KGB')[] }[] = [
  { nameIncludes: 'Ishita', grades: ['KGA'] },
  { nameIncludes: 'Riyaarth', grades: ['KGA'] },
  { nameIncludes: 'Rudransh', grades: ['KGB'] },
]

export function applyLeftSeeds(
  students: Student[],
  existingMeta: RosterMeta[],
  now = new Date().toISOString(),
): RosterMeta[] {
  const metaById = new Map(existingMeta.map((m) => [m.id, m]))
  const out = [...existingMeta]

  for (const s of students) {
    const grade = s.classKey.startsWith('KGA') ? 'KGA' : s.classKey.startsWith('KGB') ? 'KGB' : null
    if (!grade) continue
    const hit = LEFT_SEEDS.find(
      (seed) => seed.grades.includes(grade) && s.name.toLowerCase().includes(seed.nameIncludes.toLowerCase()),
    )
    if (!hit) continue
    const id = studentId(s.classKey, s.roll)
    const cur = metaById.get(id)
    if (cur?.left) continue // already left
    if (cur && !cur.left) {
      // first sync seed: only set left if never marked — treat missing as seedable; existing active stays
      // Spec: "apply on first sync if missing" — if meta exists with left=false, don't force
      continue
    }
    if (!cur) {
      const row: RosterMeta = {
        id,
        classKey: s.classKey,
        roll: s.roll,
        name: s.name,
        left: true,
        updatedAt: now,
      }
      out.push(row)
      metaById.set(id, row)
    }
  }
  return out
}

export function classKeysForGrade(grade: 'KGA' | 'KGB'): ClassKey[] {
  return grade === 'KGA'
    ? ['KGA_Eng_CW', 'KGA_Eng_HW']
    : ['KGB_Eng_CW', 'KGB_Eng_HW']
}
