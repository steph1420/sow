/** Central haptics (t169u). Feature-detected `navigator.vibrate`; iOS Safari has none → silent no-op. */
export const HAPTIC_MS = {
  /** A–Z letter change while scrubbing */
  az: 8,
  /** single tap tick / untick */
  tick: 10,
  /** swipe engage */
  engage: 8,
  /** swipe / roll-drag commit */
  commit: 15,
  /** long-press recognised (Share pill edit, drag handle) */
  hold: 10,
} as const

export type HapticKind = keyof typeof HAPTIC_MS

let enabled = true
export function setHapticsEnabled(on: boolean) {
  enabled = on
}

export function haptic(kind: HapticKind): void {
  if (!enabled) return
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { vibrate?: (p: number) => boolean }) : null
    nav?.vibrate?.(HAPTIC_MS[kind])
  } catch {
    /* blocked before first user gesture — ignore */
  }
}
