/**
 * Lean rewrite prefs — opinionated defaults, no preference farm.
 * Safety floors (A–Z idle 42, letter ≥11, hideEmpty default off) are not undercut.
 */

import { migrateLegacyShare, SEED_TEMPLATES, type ShareTemplate } from '../share/shareTemplates'

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
  /** Dev (t167u): horizontal swipe ticks only the start row (no roll-drag extension). */
  'gestures.swipeSingleRow': boolean
  /** t169u: vibration ticks (A–Z scrub, ticks). No-op where unsupported (iOS). */
  'haptics.enabled': boolean
  /** v0.28 Share (t164u) — named templates, order = display order. */
  'share.templates': ShareTemplate[]
  'share.defaultId': string
  'share.lastUsedId': string
  /** Settings default for KGA/KGB prefix; the Share sheet toggle overrides per share. */
  'share.includeClassPrefix': boolean
}

export const PREFS_DEFAULTS: AppPrefs = {
  theme: 'night',
  'theme.followSystem': false,
  'chrome.showFab': false,
  'chrome.reduceMotion': false,
  'az.leftSide': false,
  'az.hideEmpty': false,
  'az.showHud': true,
  'gestures.swipeSingleRow': false,
  'haptics.enabled': true,
  'share.templates': SEED_TEMPLATES.map((t) => ({ ...t })),
  'share.defaultId': 'pending',
  'share.lastUsedId': '',
  'share.includeClassPrefix': false,
}

const STORE_KEY = 'sow-app.prefs.v1'
/** v0.21 prefs (pre-rewrite) — may still hold the user's single `share.template`. */
const LEGACY_KEY = 'sow.prefs.v1'

function freshDefaults(): AppPrefs {
  return { ...PREFS_DEFAULTS, 'share.templates': PREFS_DEFAULTS['share.templates'].map((t) => ({ ...t })) }
}

/** One-time: seed share templates, carrying a customised legacy template into Pending. */
function withShareMigration(p: AppPrefs, hasShare: boolean): AppPrefs {
  if (hasShare) return p
  let legacy: Record<string, unknown> | null = null
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    legacy = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    legacy = null
  }
  const m = migrateLegacyShare(legacy)
  const next: AppPrefs = { ...p, 'share.templates': m.templates, 'share.defaultId': 'pending', 'share.includeClassPrefix': m.includeClassPrefix }
  try {
    savePrefs(next) // write first, then drop the legacy key
    if (m.legacyRest) localStorage.setItem(LEGACY_KEY, JSON.stringify(m.legacyRest))
  } catch {
    /* storage full / private mode — keep in memory */
  }
  return next
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<AppPrefs>) : {}
    const hasShare = Array.isArray(parsed['share.templates']) && parsed['share.templates'].length > 0
    return withShareMigration({ ...freshDefaults(), ...parsed }, hasShare)
  } catch {
    return freshDefaults()
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
