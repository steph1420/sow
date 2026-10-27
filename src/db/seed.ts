import { putMark, putRosterMeta, putSession, putSettings, putStudent } from './api'
import { getDb } from './db'
import type { ClassKey, Student } from './types'
import { studentId } from './types'

const SAMPLE: Record<ClassKey, { roll: number; name: string; left?: boolean }[]> = {
  KGA_Eng_CW: [
    { roll: 1, name: 'Aarav Sharma' },
    { roll: 2, name: 'Anaya Gupta' },
    { roll: 3, name: 'Ishita Kumari', left: true },
    { roll: 4, name: 'Kabir Mehta' },
    { roll: 5, name: 'Riyaarth Narayan', left: true },
    { roll: 6, name: 'Vivaan Joshi' },
    { roll: 7, name: 'Zoya Khan' },
    { roll: 8, name: 'Aanya Verma' },
    { roll: 9, name: 'Dev Patel' },
    { roll: 11, name: 'Mia Fernandes' },
  ],
  KGB_Eng_CW: [
    { roll: 1, name: 'Arjun Singh' },
    { roll: 2, name: 'Diya Kapoor' },
    { roll: 3, name: 'Rudransh Pandey', left: true },
    { roll: 4, name: 'Sara Ali' },
    { roll: 5, name: 'Vihaan Rao' },
  ],
  KGA_Eng_HW: [
    { roll: 1, name: 'Aarav Sharma' },
    { roll: 2, name: 'Anaya Gupta' },
    { roll: 3, name: 'Ishita Kumari', left: true },
    { roll: 4, name: 'Kabir Mehta' },
    { roll: 5, name: 'Riyaarth Narayan', left: true },
  ],
  KGB_Eng_HW: [
    { roll: 1, name: 'Arjun Singh' },
    { roll: 2, name: 'Diya Kapoor' },
    { roll: 3, name: 'Rudransh Pandey', left: true },
    { roll: 4, name: 'Sara Ali' },
  ],
}

function uuid(): string {
  return crypto.randomUUID()
}

export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const db = await getDb()
  const settings = await db.get('settings', 'app')
  if (settings?.seededAt) return { seeded: false }

  const ts = new Date().toISOString()

  for (const classKey of Object.keys(SAMPLE) as ClassKey[]) {
    for (const row of SAMPLE[classKey]) {
      const student: Student = {
        id: studentId(classKey, row.roll),
        classKey,
        roll: row.roll,
        name: row.name,
      }
      await putStudent(student)
      await putRosterMeta({
        classKey,
        roll: row.roll,
        name: row.name,
        left: !!row.left,
        updatedAt: ts,
      })
    }
  }

  // Sample session: KGA Eng CW with two dates
  const sessionId = uuid()
  await putSession({
    sessionId,
    classKey: 'KGA_Eng_CW',
    date1: '14/10',
    topic1: 'Topic P',
    date2: '26/10',
    topic2: 'Topic P',
    createdAt: ts,
    updatedAt: ts,
  })

  // Partial marks for demos
  const marks: { roll: number; date: string; set: boolean; submitted: boolean }[] = [
    { roll: 1, date: '14/10', set: true, submitted: true },
    { roll: 1, date: '26/10', set: false, submitted: false },
    { roll: 2, date: '14/10', set: true, submitted: true },
    { roll: 2, date: '26/10', set: true, submitted: true },
    { roll: 6, date: '14/10', set: true, submitted: true },
    { roll: 6, date: '26/10', set: false, submitted: false },
    { roll: 8, date: '14/10', set: true, submitted: false },
    { roll: 8, date: '26/10', set: true, submitted: false },
    { roll: 9, date: '26/10', set: true, submitted: false },
  ]
  const names = new Map(SAMPLE.KGA_Eng_CW.map((s) => [s.roll, s.name]))
  for (const m of marks) {
    await putMark({
      classKey: 'KGA_Eng_CW',
      roll: m.roll,
      name: names.get(m.roll) ?? '',
      date: m.date,
      topic: 'Topic P',
      set: m.set,
      submitted: m.submitted,
      updatedAt: ts,
    })
  }

  await putSettings({
    hideLeft: false,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1SdbZP8dHmNl2xhd9_srt6n-U2gqkQH8Aj7du5B5Mviw/edit',
    syncUrl: '',
    theme: 'night',
    seededAt: ts,
  })

  return { seeded: true }
}
