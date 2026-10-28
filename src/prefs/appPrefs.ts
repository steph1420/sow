/**
 * Lean rewrite prefs — opinionated defaults, no preference farm.
 * Safety floors (A–Z idle 42, letter ≥11, hideEmpty default off) are not undercut.
 */

export type ThemeId = 'night' | 'day'

export type AppPrefs = {
  theme: ThemeId
  /** Match phone dark/light when on. */
  'theme.followSystem': boolean
  /** Sort/Filters FAB — Steve default hide (t118u). */
  'chrome.showFab': boolean
  /** Soft: less glow on stroke. */
  'chrome.reduceMotion': boolean
  /** Dev: A–Z on left. */
  'az.leftSide': boolean
  /** Hide dimmed A–Z letters (Appearance Checklist feel) — default OFF. */
  'az.hideEmpty': boolean
  /** Dev: letter HUD while scrubbing. */
  'az.showHud': boolean
}

export const PREFS_DEFAULTS: AppPrefs = {
  theme: 'night',
  'theme.followSystem': false,
  'chrome.showFab': false,
  'chrome.reduceMotion': false,
  'az.leftSide': false,
  'az.hideEmpty': false,
  'az.showHud': true,
}

const STORE_KEY = 'sow-app.prefs.v1'

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return { ...PREFS_DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppPrefs>
    return { ...PREFS_DEFAULTS, ...parsed }
  } catch {
    return { ...PREFS_DEFAULTS }
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(prefs))
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'day' ? '#f4f5f7' : '#0a0b0e')
}

/** Resolve theme when follow-system is on. */
export function resolveTheme(prefs: AppPrefs): ThemeId {
  if (!prefs['theme.followSystem']) return prefs.theme
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night'
  }
  return prefs.theme
}
