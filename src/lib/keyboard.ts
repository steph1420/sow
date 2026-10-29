/**
 * v0.37.0 keyboard + widescreen helpers (Steve t62u/t64u; docs/KEYBOARD_WIDESCREEN_PLAN.md).
 * Letters are never global: they act only while the A–Z strip is focused ("/" focuses it).
 */
import { AZ_LETTERS, stripLetterOf } from '../checklist/gestures/azLayout'

type Row = { roll: number; name: string }

/** Typed letter in the A–Z strip → first pupil with it; same letter again cycles; empty letter → next letter with pupils. */
export function azKeyJump(key: string, rows: Row[], currentRoll: number | null): { roll: number; letter: string; exact: boolean } | null {
  const L = key.toUpperCase()
  const start = (AZ_LETTERS as readonly string[]).indexOf(L)
  if (start < 0 || !rows.length) return null
  const same = rows.filter((r) => stripLetterOf(r.name) === L)
  if (same.length) {
    const i = same.findIndex((r) => r.roll === currentRoll)
    const next = i >= 0 ? same[(i + 1) % same.length] : same[0]
    return { roll: next.roll, letter: L, exact: true }
  }
  for (let i = start + 1; i < AZ_LETTERS.length; i++) {
    const hit = rows.find((r) => stripLetterOf(r.name) === AZ_LETTERS[i])
    if (hit) return { roll: hit.roll, letter: AZ_LETTERS[i]!, exact: false }
  }
  return null
}

/** APG grid navigation: [rowIndex, colIndex] or null when the key is not a move. */
export function gridMove(key: string, row: number, col: number, nRows: number, nCols: number): [number, number] | null {
  const clampR = (r: number) => Math.max(0, Math.min(nRows - 1, r))
  const clampC = (c: number) => Math.max(0, Math.min(nCols - 1, c))
  switch (key) {
    case 'ArrowDown': return [clampR(row + 1), col]
    case 'ArrowUp': return [clampR(row - 1), col]
    case 'ArrowRight': return [row, clampC(col + 1)]
    case 'ArrowLeft': return [row, clampC(col - 1)]
    case 'Home': return [0, col]
    case 'End': return [nRows - 1, col]
    case 'PageDown': return [clampR(row + 10), col]
    case 'PageUp': return [clampR(row - 10), col]
    default: return null
  }
}

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])
export function isTypingTarget(el: (Partial<HTMLElement> & { type?: string }) | null | undefined): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  const t = String(el.tagName || '').toUpperCase()
  if (t === 'TEXTAREA' || t === 'SELECT') return true
  if (t === 'INPUT') return !NON_TEXT_INPUTS.has(String(el.type || 'text').toLowerCase())
  return false
}

/** Widescreen (Q-WIDE-1 option i): same phone UI scaled to fit the height, never above 1.6×, never below 1. */
export const PHONE_W = 412, PHONE_H = 915, WIDE_MAX = 1.6
export function wideScale(w: number, h: number): number {
  const s = Math.min(h / PHONE_H, w / PHONE_W, WIDE_MAX)
  return s <= 1.0001 ? 1 : Math.round(s * 1000) / 1000
}

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
export const MOD = IS_MAC ? '⌘' : 'Ctrl'
/** Cmd on Mac, Ctrl elsewhere (never both, never the other one). */
export function isMod(e: { metaKey: boolean; ctrlKey: boolean }, mac = IS_MAC): boolean {
  return mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey
}

/** Single source for the "?" sheet. Browser-reserved combos (Mod+W/T/N/Q) are never used. */
export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  { group: 'Anywhere', items: [
    ['?', 'Keyboard shortcuts'],
    [`${MOD}+1 / 2 / 3  ·  Alt+1 / 2 / 3`, 'Overview · Checklist · More'],
    ['[  /  ]', 'Previous / next tab'],
    [`${MOD}+,`, 'Settings'],
    [`${MOD}+S`, 'Sync now'],
    [`${MOD}+Shift+L`, 'Night / Day'],
    ['Esc', 'Close sheet · leave search, strip or select'],
    ['Alt+←  ·  Backspace', 'Back'],
    ['Tab  /  Shift+Tab', 'Next / previous control'],
    ['Enter  ·  Space', 'Activate button · toggle switch'],
    ['PgUp / PgDn  ·  Space / Shift+Space  ·  Home / End', 'Scroll page (outside the grid)'],
  ] },
  { group: 'Checklist', items: [
    ['↑ ↓ ← →', 'Move between ticks'],
    ['PgUp / PgDn  ·  Home / End', 'Jump 10 rows · first / last pupil'],
    ['Space  ·  Enter', 'Tick / untick, then next pupil (Dev option)'],
    ['L', `Mark pupil Left (${MOD}+Z undoes)`],
    ['Shift+Space', 'Row swipe: tick / untick both dates'],
    ['Shift+↑ / ↓', 'Select rows (long-press drag)'],
    ['M', 'Switch Set ⇄ Submitted mode (while in the grid)'],
    ['P', 'Pending only (pupils left) on / off'],
    [`${MOD}+F`, 'Search pupils'],
    [`${MOD}+Z  ·  ${MOD}+Shift+Z`, 'Undo · redo'],
  ] },
  { group: 'Overview', items: [
    ['↑ ↓', 'Previous / next class card'],
    ['Enter', 'Expand card · Tab to Open / Share'],
  ] },
  { group: 'A–Z strip', items: [
    ['/', 'Focus the A–Z strip'],
    ['A–Z', 'Jump to letter (again = next pupil)'],
    ['↑ ↓', 'Previous / next letter'],
    ['Enter', 'Into the grid at that pupil'],
    ['Esc', 'Back to the grid'],
  ] },
]
