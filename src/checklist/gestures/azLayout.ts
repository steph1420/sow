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
 * Pass `letters` when hide-dimmed shrinks the strip.
 */
export function letterAtY(
  clientY: number,
  stripTop: number,
  stripHeight: number,
  letters: readonly AzLetter[] = AZ_LETTERS,
): AzLetter {
  if (stripHeight <= 0 || letters.length === 0) return '*'
  const t = (clientY - stripTop) / stripHeight
  const i = Math.min(letters.length - 1, Math.max(0, Math.floor(t * letters.length)))
  return letters[i]!
}

/**
 * First row for letter; empty letter → latch next populated (immersion).
 * `*` → first row.
 */
export function jumpLetterToRoll(
  letter: AzLetter,
  rows: { roll: number; name: string }[],
): number | null {
  if (!rows.length) return null
  if (letter === '*') return rows[0]!.roll
  const start = AZ_LETTERS.indexOf(letter)
  if (start < 0) return null
  for (let i = start; i < AZ_LETTERS.length; i++) {
    const L = AZ_LETTERS[i]!
    const hit = rows.find((r) => firstLetterOfName(r.name) === L)
    if (hit) return hit.roll
  }
  return null
}

/** True when finger letter has no names (HUD should dim; latch still jumps next). */
export function letterEmpty(letter: AzLetter, names: string[]): boolean {
  if (letter === '*') return names.length === 0
  return !presentLetters(names).has(letter)
}
