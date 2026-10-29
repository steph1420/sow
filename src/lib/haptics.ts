/**
 * Central haptics — v0.29 graded palette (t170u "many types of haptic strength").
 * Feature-detected `navigator.vibrate`; iOS Safari has none → silent no-op.
 * Web can't set amplitude, so strength = pulse length. Intensity scales pulses (not gaps).
 */
export const HAPTIC = {
  /** detent: A–Z letter, row entered during roll/swipe drag */
  selection: 7,
  /** tap tick, undo/redo, Copied, swipe engage, long-press recognised */
  light: 10,
  /** swipe/roll commit, Mark/Clear, mode switch, copy marks */
  medium: 18,
  /** mode entry (Select), back-to-exit warning */
  heavy: 30,
  /** Sync done, tick-all */
  success: [12, 40, 12] as number[],
  /** Sync failed / offline */
  error: [30, 60, 30] as number[],
}
export type HapticKind = keyof typeof HAPTIC
export type HapticLevel = 'off' | 'light' | 'normal' | 'strong'
const SCALE: Record<HapticLevel, number> = { off: 0, light: 0.6, normal: 1, strong: 1.5 }

export function scalePattern(p: number | number[], level: HapticLevel): number | number[] {
  const k = SCALE[level]
  const s = (ms: number) => Math.max(4, Math.round(ms * k))
  return Array.isArray(p) ? p.map((ms, i) => (i % 2 === 0 ? s(ms) : ms)) : s(p)
}

let level: HapticLevel = 'normal'
export function setHapticsLevel(l: HapticLevel) {
  level = l
}
/** compat */
export function setHapticsEnabled(on: boolean) {
  level = on ? (level === 'off' ? 'normal' : level) : 'off'
}

export function haptic(kind: HapticKind): void {
  if (level === 'off') return
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }) : null
    nav?.vibrate?.(scalePattern(HAPTIC[kind], level))
  } catch {
    /* blocked before first user gesture — ignore */
  }
}
