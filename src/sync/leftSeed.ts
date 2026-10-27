import type { ClassKey, RosterMeta, Student } from '../db'
import { studentId } from '../db'

/** Locked Left seeds (Sync A / SHEET_MAPPING) — exact classKey + roll. */
export const LEFT_SEED_KEYS: { classKey: ClassKey; roll: number; nameIncludes: string }[] = [
  { classKey: 'KGA_Eng_CW', roll: 19, nameIncludes: 'Ishita' },
  { classKey: 'KGA_Eng_HW', roll: 19, nameIncludes: 'Ishita' },
  { classKey: 'KGA_Eng_CW', roll: 31, nameIncludes: 'Riyaarth' },
  { classKey: 'KGA_Eng_HW', roll: 31, nameIncludes: 'Riyaarth' },
  { classKey: 'KGB_Eng_CW', roll: 33, nameIncludes: 'Rudransh' },
  { classKey: 'KGB_Eng_HW', roll: 33, nameIncludes: 'Rudransh' },
]

function isLockedLeft(classKey: ClassKey, roll: number): boolean {
  return LEFT_SEED_KEYS.some((s) => s.classKey === classKey && s.roll === roll)
}

/**
 * Clear demo/wrong Left; ensure locked seed rolls are Left when that student exists.
 * Does not invent Left for name-only matches on wrong rolls.
 */
export function applyLeftSeeds(
  students: Student[],
  existingMeta: RosterMeta[],
  now = new Date().toISOString(),
): RosterMeta[] {
  const byId = new Map(existingMeta.map((m) => [m.id, { ...m }]))
  const studentById = new Map(students.map((s) => [s.id, s]))

  // Clear Left that is not in the locked seed list
  for (const m of byId.values()) {
    if (m.left && !isLockedLeft(m.classKey, m.roll)) {
      m.left = false
      m.updatedAt = now
    }
  }

  // Apply locked seeds when the roll exists on roster
  for (const seed of LEFT_SEED_KEYS) {
    const id = studentId(seed.classKey, seed.roll)
    const student = studentById.get(id)
    if (!student) continue
    const cur = byId.get(id)
    if (cur) {
      if (!cur.left) {
        cur.left = true
        cur.name = student.name || cur.name
        cur.updatedAt = now
      }
    } else {
      byId.set(id, {
        id,
        classKey: seed.classKey,
        roll: seed.roll,
        name: student.name,
        left: true,
        updatedAt: now,
      })
    }
  }

  return [...byId.values()]
}

export function classKeysForGrade(grade: 'KGA' | 'KGB'): ClassKey[] {
  return grade === 'KGA'
    ? ['KGA_Eng_CW', 'KGA_Eng_HW']
    : ['KGB_Eng_CW', 'KGB_Eng_HW']
}
