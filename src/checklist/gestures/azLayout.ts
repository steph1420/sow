/** A–Z anti-squish layout — absolute % slots, idle 42, letter ≥11px. */

export const AZ_LETTERS = [
  '*',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
] as const

export type AzLetter = (typeof AZ_LETTERS)[number]

export const AZ_IDLE_W = 42
export const AZ_LETTER_MIN_PX = 11

/** Top % for letter index i of N (absolute slots — never flex-squish). */
export function azSlotTopPercent(index: number, total = AZ_LETTERS.length): number {
  return (index / total) * 100
}

export function firstLetterOfName(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(ch) ? ch : '*'
}

/** Letters present in roster (for dim-missing). */
export function presentLetters(names: string[]): Set<string> {
  const s = new Set<string>()
  for (const n of names) s.add(firstLetterOfName(n))
  return s
}

/**
 * Which letter is under Y in a strip of height h starting at top.
 */
export function letterAtY(clientY: number, stripTop: number, stripHeight: number): AzLetter {
  if (stripHeight <= 0) return '*'
  const t = (clientY - stripTop) / stripHeight
  const i = Math.min(AZ_LETTERS.length - 1, Math.max(0, Math.floor(t * AZ_LETTERS.length)))
  return AZ_LETTERS[i]!
}
