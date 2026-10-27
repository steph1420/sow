import type { ClassKey } from '../db'
import { CLASS_LABELS } from '../db'

export function splitClass(key: ClassKey): { grade: string; kind: string; short: string } {
  const label = CLASS_LABELS[key]
  const [grade, , abbr] = label.split(' ')
  const kind = abbr === 'HW' ? 'English · Homework' : 'English · Classwork'
  return { grade, kind, short: label }
}

export function parseClassParam(raw: string | null): ClassKey | null {
  if (!raw) return null
  const ok = ['KGA_Eng_CW', 'KGB_Eng_CW', 'KGA_Eng_HW', 'KGB_Eng_HW'] as const
  return (ok as readonly string[]).includes(raw) ? (raw as ClassKey) : null
}
