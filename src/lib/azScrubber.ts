/** A–Z section-index helpers (iOS Contacts–style scrubber). */

export const AZ_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const

/** Slot 0 = All (*); slots 1..26 = A..Z */
export const AZ_SLOT_COUNT = 27

export function slotFromY(clientY: number, top: number, height: number, slotCount = AZ_SLOT_COUNT): number {
  if (height <= 0) return 0
  const t = (clientY - top) / height
  return Math.max(0, Math.min(slotCount - 1, Math.floor(t * slotCount)))
}

/** null means All / clear filter */
export function letterFromSlot(slot: number): string | null {
  if (slot <= 0) return null
  return AZ_LETTERS[slot - 1] ?? null
}

export function presentLettersFromNames(names: Iterable<string>): Set<string> {
  const set = new Set<string>()
  for (const name of names) {
    const ch = name.trim()[0]?.toUpperCase()
    if (ch && ch >= 'A' && ch <= 'Z') set.add(ch)
  }
  return set
}
