import { CLASS_LABELS, type ClassKey } from '../../../db'

/** Display title: `KGA · Eng CW` */
export function classTitle(key: ClassKey): string {
  const label = CLASS_LABELS[key]
  const [grade, ...rest] = label.split(' ')
  return `${grade} · ${rest.join(' ')}`
}
