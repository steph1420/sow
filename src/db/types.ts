/** Field names aligned with /workspace/sow-pwa-docs/SHEET_MAPPING.md */

export type ClassKey = 'KGA_Eng_CW' | 'KGB_Eng_CW' | 'KGA_Eng_HW' | 'KGB_Eng_HW'

export const CLASS_KEYS: ClassKey[] = [
  'KGA_Eng_CW',
  'KGB_Eng_CW',
  'KGA_Eng_HW',
  'KGB_Eng_HW',
]

export const CLASS_LABELS: Record<ClassKey, string> = {
  KGA_Eng_CW: 'KGA Eng CW',
  KGB_Eng_CW: 'KGB Eng CW',
  KGA_Eng_HW: 'KGA Eng HW',
  KGB_Eng_HW: 'KGB Eng HW',
}

export interface Student {
  /** `${classKey}|${roll}` */
  id: string
  classKey: ClassKey
  roll: number
  name: string
}

export interface RosterMeta {
  /** `${classKey}|${roll}` */
  id: string
  classKey: ClassKey
  roll: number
  name: string
  left: boolean
  updatedAt: string
}

export interface Session {
  sessionId: string
  classKey: ClassKey
  date1: string
  topic1: string
  date2: string
  topic2: string
  createdAt: string
  updatedAt: string
}

export interface Mark {
  markId: string
  classKey: ClassKey
  roll: number
  name: string
  date: string
  topic: string
  set: boolean
  submitted: boolean
  updatedAt: string
}

export interface Settings {
  id: 'app'
  hideLeft: boolean
  sheetUrl: string
  theme: 'night' | 'day'
  seededAt?: string
}

export function studentId(classKey: ClassKey, roll: number): string {
  return `${classKey}|${roll}`
}

export function markId(classKey: ClassKey, roll: number, date: string): string {
  return `${classKey}|${roll}|${date}`
}
