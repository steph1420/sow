/** Central SoW prefs (`sow.prefs.v1`) — localStorage + export/import. */

export type OverviewFilterStyle = 'underline' | 'shade' | 'boldColor'
export type UndoChrome = 'icons' | 'iconsLabel'
export type AzMode = 'single' | 'fisheye'
export type FilterDefault = 'none' | 'pending' | 'letter'
export type FilterUi = 'myntra' | 'popover' | 'chips'
export type DateUi = 'quiet' | 'tinyChips' | 'filtersOnly' | 'slimBar' | 'dualCards'
export type StatusMode = 'hidden' | 'withDate' | 'inDate'

export type SowPrefs = {
  'az.mode': AzMode
  'az.hideEmpty': boolean
  'az.widenOnPress': boolean
  'az.pressWidth': number
  'az.pressFont': number
  'az.focusFont': number
  'az.fe.strength': number
  'az.fe.push': number
  'az.fe.relative': number
  'az.fe.count': number
  'az.showHud': boolean
  'filter.default': FilterDefault
  'filter.showPending': boolean
  'filter.showLetter': boolean
  'filter.showSort': boolean
  'filter.showSearch': boolean
  'filter.ui': FilterUi
  'date.ui': DateUi
  'status.mode': StatusMode
  'undo.chrome': UndoChrome
  'overview.filterStyle': OverviewFilterStyle
  'appearance.nightBold': boolean
  'appearance.dayBold': boolean
  'appearance.dayHC': boolean
}

export const PREFS_DEFAULTS: SowPrefs = {
  'az.mode': 'fisheye',
  'az.hideEmpty': false,
  'az.widenOnPress': true,
  'az.pressWidth': 48,
  'az.pressFont': 12,
  'az.focusFont': 22,
  'az.fe.strength': 70,
  'az.fe.push': 80,
  'az.fe.relative': 55,
  'az.fe.count': 2,
  'az.showHud': true,
  'filter.default': 'none',
  'filter.showPending': true,
  'filter.showLetter': true,
  'filter.showSort': true,
  'filter.showSearch': true,
  'filter.ui': 'myntra',
  'date.ui': 'quiet',
  'status.mode': 'hidden',
  'undo.chrome': 'icons',
  'overview.filterStyle': 'shade',
  'appearance.nightBold': false,
  'appearance.dayBold': false,
  'appearance.dayHC': false,
}

const STORE_KEY = 'sow.prefs.v1'
const LEGACY_FILTER = 'sow.prefs.overview.filterStyle'
const LEGACY_UNDO = 'sow.prefs.undo.chrome'
const EVENT = 'sow-prefs'

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function parseBool(raw: string, fallback: boolean): boolean {
  const s = raw.trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false
  return fallback
}

function parseNum(raw: string, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function coerce(partial: Partial<Record<string, unknown>>): SowPrefs {
  const d = PREFS_DEFAULTS
  const g = <K extends keyof SowPrefs>(k: K): unknown =>
    partial[k] !== undefined ? partial[k] : d[k]

  const mode = String(g('az.mode'))
  const filterDefault = String(g('filter.default'))
  const filterUi = String(g('filter.ui'))
  const dateUi = String(g('date.ui'))
  const status = String(g('status.mode'))
  const undo = String(g('undo.chrome'))
  const ov = String(g('overview.filterStyle'))

  return {
    'az.mode': mode === 'single' ? 'single' : 'fisheye',
    'az.hideEmpty': Boolean(g('az.hideEmpty')),
    'az.widenOnPress': Boolean(g('az.widenOnPress')),
    'az.pressWidth': clamp(Number(g('az.pressWidth')) || d['az.pressWidth'], 16, 72),
    'az.pressFont': clamp(Number(g('az.pressFont')) || d['az.pressFont'], 8, 20),
    'az.focusFont': clamp(Number(g('az.focusFont')) || d['az.focusFont'], 12, 36),
    'az.fe.strength': clamp(Number(g('az.fe.strength')) || 0, 0, 100),
    'az.fe.push': clamp(Number(g('az.fe.push')) || 0, 0, 100),
    'az.fe.relative': clamp(Number(g('az.fe.relative')) || 0, 0, 100),
    'az.fe.count': clamp(Math.round(Number(g('az.fe.count')) || 0), 1, 5),
    'az.showHud': Boolean(g('az.showHud')),
    'filter.default':
      filterDefault === 'pending' || filterDefault === 'letter' ? filterDefault : 'none',
    'filter.showPending': Boolean(g('filter.showPending')),
    'filter.showLetter': Boolean(g('filter.showLetter')),
    'filter.showSort': Boolean(g('filter.showSort')),
    'filter.showSearch': Boolean(g('filter.showSearch')),
    'filter.ui':
      filterUi === 'popover' || filterUi === 'chips' ? filterUi : 'myntra',
    'date.ui':
      dateUi === 'tinyChips' ||
      dateUi === 'filtersOnly' ||
      dateUi === 'slimBar' ||
      dateUi === 'dualCards'
        ? dateUi
        : 'quiet',
    'status.mode':
      status === 'withDate' || status === 'inDate' ? status : 'hidden',
    'undo.chrome': undo === 'iconsLabel' ? 'iconsLabel' : 'icons',
    'overview.filterStyle':
      ov === 'underline' || ov === 'boldColor' ? ov : 'shade',
    'appearance.nightBold': Boolean(g('appearance.nightBold')),
    'appearance.dayBold': Boolean(g('appearance.dayBold')),
    'appearance.dayHC': Boolean(g('appearance.dayHC')),
  }
}

function readLegacy(): Partial<SowPrefs> {
  const out: Partial<SowPrefs> = {}
  try {
    const f = localStorage.getItem(LEGACY_FILTER)
    if (f === 'underline' || f === 'shade' || f === 'boldColor') out['overview.filterStyle'] = f
    const u = localStorage.getItem(LEGACY_UNDO)
    if (u === 'icons' || u === 'iconsLabel') out['undo.chrome'] = u
  } catch {
    /* ignore */
  }
  return out
}

export function loadPrefs(): SowPrefs {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return coerce({ ...readLegacy(), ...parsed })
    }
  } catch {
    /* ignore */
  }
  return coerce(readLegacy())
}

export function savePrefs(patch: Partial<SowPrefs>): SowPrefs {
  const next = coerce({ ...loadPrefs(), ...patch })
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
    // Keep legacy keys in sync for any stray readers
    localStorage.setItem(LEGACY_FILTER, next['overview.filterStyle'])
    localStorage.setItem(LEGACY_UNDO, next['undo.chrome'])
  } catch {
    /* ignore */
  }
  applyAppearanceAttrs(next)
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  } catch {
    /* non-DOM */
  }
  return next
}

export function subscribePrefs(cb: (p: SowPrefs) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<SowPrefs>).detail ?? loadPrefs())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

export function applyAppearanceAttrs(
  prefs?: SowPrefs,
  theme?: 'night' | 'day',
): void {
  if (typeof document === 'undefined') return
  const p = prefs ?? loadPrefs()
  const root = document.documentElement
  const t =
    theme ??
    ((root.getAttribute('data-theme') === 'day' ? 'day' : 'night') as 'night' | 'day')
  root.setAttribute('data-night-bold', t === 'night' && p['appearance.nightBold'] ? 'on' : 'off')
  root.setAttribute('data-day-bold', t === 'day' && p['appearance.dayBold'] ? 'on' : 'off')
  root.setAttribute('data-day-hc', t === 'day' && p['appearance.dayHC'] ? 'on' : 'off')
}

export function exportPrefsText(prefs: SowPrefs = loadPrefs()): string {
  const lines = ['sow.prefs.v1']
  for (const key of Object.keys(PREFS_DEFAULTS) as (keyof SowPrefs)[]) {
    const v = prefs[key]
    lines.push(`${key}=${typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}`)
  }
  return lines.join('\n')
}

/** Parse export block; returns null if header missing. */
export function parsePrefsExport(text: string): Partial<SowPrefs> | null {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length || lines[0] !== 'sow.prefs.v1') return null
  const raw: Record<string, string> = {}
  for (const line of lines.slice(1)) {
    const i = line.indexOf('=')
    if (i <= 0) continue
    raw[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  const patch: Partial<SowPrefs> = {}
  const d = PREFS_DEFAULTS
  if (raw['az.mode']) patch['az.mode'] = raw['az.mode'] === 'single' ? 'single' : 'fisheye'
  if (raw['az.hideEmpty'] !== undefined) patch['az.hideEmpty'] = parseBool(raw['az.hideEmpty'], d['az.hideEmpty'])
  if (raw['az.widenOnPress'] !== undefined)
    patch['az.widenOnPress'] = parseBool(raw['az.widenOnPress'], d['az.widenOnPress'])
  if (raw['az.pressWidth'] !== undefined) patch['az.pressWidth'] = parseNum(raw['az.pressWidth'], d['az.pressWidth'])
  if (raw['az.pressFont'] !== undefined) patch['az.pressFont'] = parseNum(raw['az.pressFont'], d['az.pressFont'])
  if (raw['az.focusFont'] !== undefined) patch['az.focusFont'] = parseNum(raw['az.focusFont'], d['az.focusFont'])
  if (raw['az.fe.strength'] !== undefined)
    patch['az.fe.strength'] = parseNum(raw['az.fe.strength'], d['az.fe.strength'])
  if (raw['az.fe.push'] !== undefined) patch['az.fe.push'] = parseNum(raw['az.fe.push'], d['az.fe.push'])
  if (raw['az.fe.relative'] !== undefined)
    patch['az.fe.relative'] = parseNum(raw['az.fe.relative'], d['az.fe.relative'])
  if (raw['az.fe.count'] !== undefined) patch['az.fe.count'] = parseNum(raw['az.fe.count'], d['az.fe.count'])
  if (raw['az.showHud'] !== undefined) patch['az.showHud'] = parseBool(raw['az.showHud'], d['az.showHud'])
  if (raw['filter.default']) {
    const v = raw['filter.default']
    patch['filter.default'] = v === 'pending' || v === 'letter' ? v : 'none'
  }
  if (raw['filter.showPending'] !== undefined)
    patch['filter.showPending'] = parseBool(raw['filter.showPending'], true)
  if (raw['filter.showLetter'] !== undefined)
    patch['filter.showLetter'] = parseBool(raw['filter.showLetter'], true)
  if (raw['filter.showSort'] !== undefined)
    patch['filter.showSort'] = parseBool(raw['filter.showSort'], true)
  if (raw['filter.showSearch'] !== undefined)
    patch['filter.showSearch'] = parseBool(raw['filter.showSearch'], true)
  if (raw['filter.ui']) {
    const v = raw['filter.ui']
    patch['filter.ui'] = v === 'popover' || v === 'chips' ? v : 'myntra'
  }
  if (raw['date.ui']) {
    const v = raw['date.ui']
    patch['date.ui'] =
      v === 'tinyChips' || v === 'filtersOnly' || v === 'slimBar' || v === 'dualCards' ? v : 'quiet'
  }
  if (raw['status.mode']) {
    const v = raw['status.mode']
    patch['status.mode'] = v === 'withDate' || v === 'inDate' ? v : 'hidden'
  }
  if (raw['undo.chrome'])
    patch['undo.chrome'] = raw['undo.chrome'] === 'iconsLabel' ? 'iconsLabel' : 'icons'
  if (raw['overview.filterStyle']) {
    const v = raw['overview.filterStyle']
    patch['overview.filterStyle'] = v === 'underline' || v === 'boldColor' ? v : 'shade'
  }
  if (raw['appearance.nightBold'] !== undefined)
    patch['appearance.nightBold'] = parseBool(raw['appearance.nightBold'], false)
  if (raw['appearance.dayBold'] !== undefined)
    patch['appearance.dayBold'] = parseBool(raw['appearance.dayBold'], false)
  if (raw['appearance.dayHC'] !== undefined)
    patch['appearance.dayHC'] = parseBool(raw['appearance.dayHC'], false)
  return patch
}

export function importPrefsText(text: string): SowPrefs | null {
  const patch = parsePrefsExport(text)
  if (!patch) return null
  return savePrefs(patch)
}

/* —— Compat shims (old modules) —— */
export function getOverviewFilterStyle(): OverviewFilterStyle {
  return loadPrefs()['overview.filterStyle']
}
export function setOverviewFilterStyle(style: OverviewFilterStyle): void {
  savePrefs({ 'overview.filterStyle': style })
}
export function getUndoChrome(): UndoChrome {
  return loadPrefs()['undo.chrome']
}
export function setUndoChrome(v: UndoChrome): void {
  savePrefs({ 'undo.chrome': v })
}
