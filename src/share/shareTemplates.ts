/**
 * Share templates (v0.28.0, locked Steve t164u) — pure logic.
 * Recovered from v0.21 `waShare.ts` (git 489b3a3~1); now multiple named templates.
 */

export type ShareTemplate = { id: string; name: string; body: string; builtin?: boolean }

export type ShareState = {
  templates: ShareTemplate[]
  defaultId: string
  lastUsedId: string
  /** Settings default for the KGA/KGB prefix (sheet toggle is a per-share override). */
  includeClassPrefix: boolean
}

/** Locked default (Steve 27 Oct) — exact old text. */
export const DEFAULT_PENDING_BODY = '{class} • {date} • not set/found ({count}):\n{names}'

export const SEED_TEMPLATES: ShareTemplate[] = [
  { id: 'pending', name: 'Pending', body: DEFAULT_PENDING_BODY, builtin: true },
  { id: 'completed', name: 'Completed', body: '{class} • {date} • set ({count.set}/{count.active}):\n{names.set}', builtin: true },
  {
    id: 'submitted',
    name: 'Submitted',
    body: '{class} • {date} • submitted ({count.submitted}/{count.active}):\n{names.submitted}',
    builtin: true,
  },
  {
    id: 'not-submitted',
    name: 'Not submitted',
    body: '{class} • {date} • not submitted ({count.notSubmitted}):\n{names.notSubmitted}',
    builtin: true,
  },
]

export const NAME_MAX = 24
/** wa.me URLs beyond ~2000 chars get cut on some Android builds — warn earlier. */
export const WA_LONG_WARN = 1500
export const PREVIEW_MAX_LINES = 9

export type ShareLists = {
  notSet: string[]
  set: string[]
  notSubmitted: string[]
  submitted: string[]
  active: string[]
  left: string[]
}

type Bucket = keyof ShareLists
const BUCKETS: Bucket[] = ['notSet', 'set', 'notSubmitted', 'submitted', 'active', 'left']

/** Every token the filler understands (aliases included). */
export const KNOWN_TOKENS: string[] = [
  '{class}',
  '{date}',
  '{topic}',
  '{count}',
  '{names}',
  '{notSet}',
  '{set}',
  ...BUCKETS.flatMap((b) => [`{count.${b}}`, `{names.${b}}`]),
]

/** Editor chips (mock mj4). `{count.*}` expands to the count group. */
export const NAME_CHIPS = ['{class}', '{date}', '{topic}', '{names.notSet}', '{names.set}', '{names.submitted}', '{names.notSubmitted}', '{names.left}']
export const COUNT_CHIPS = ['{count}', '{count.set}', '{count.notSet}', '{count.submitted}', '{count.notSubmitted}', '{count.active}', '{count.left}']
/** Submitted-family tokens render purple. */
export const isSubmittedToken = (t: string) => /submitted/i.test(t)

type RosterRow = { roll: number; name: string; left?: boolean }
type MarkCell = { set?: boolean; submitted?: boolean }

/** Name buckets for class × date (roll order; left only in `left`). */
export function buildShareLists(roster: RosterRow[], marks: Record<string, MarkCell | undefined>, date: string): ShareLists {
  const out: ShareLists = { notSet: [], set: [], notSubmitted: [], submitted: [], active: [], left: [] }
  for (const s of [...roster].sort((a, b) => a.roll - b.roll)) {
    const name = String(s.name ?? '').trim()
    if (!name) continue
    if (s.left) {
      out.left.push(name)
      continue
    }
    out.active.push(name)
    const m = marks[`${s.roll}|${date}`]
    ;(m?.set ? out.set : out.notSet).push(name)
    ;(m?.submitted ? out.submitted : out.notSubmitted).push(name)
  }
  return out
}

export function formatClassForShare(classLabel: string, includePrefix: boolean): string {
  const label = String(classLabel ?? '').trim()
  return includePrefix ? label : label.replace(/^(KGA|KGB)\s+/i, '')
}

export type ShareInput = {
  /** Full class label, e.g. `KGA Eng CW`. */
  classLabel: string
  /** Sheet date `28/10`. */
  date: string
  topic?: string
  lists: ShareLists
  body: string
  includeClassPrefix?: boolean
  /** Preview only: what an empty names list renders as (send keeps it empty). */
  emptyNames?: string
}

function tokenValues(input: ShareInput): Record<string, string> {
  const L = input.lists
  const names = (a: string[]) => (a.length ? a.join('\n') : (input.emptyNames ?? ''))
  const v: Record<string, string> = {
    '{class}': formatClassForShare(input.classLabel, !!input.includeClassPrefix),
    '{date}': String(input.date ?? '').trim(),
    '{topic}': String(input.topic ?? '').trim(),
    '{count}': String(L.notSet.length),
    '{names}': names(L.notSet),
    '{notSet}': names(L.notSet),
    '{set}': names(L.set),
  }
  for (const b of BUCKETS) {
    v[`{count.${b}}`] = String(L[b].length)
    v[`{names.${b}}`] = names(L[b])
  }
  return v
}

/** Fill a template in one pass — a token is matched whole, so `{names}` never eats `{names.notSet}`. */
export function buildShareMessage(input: ShareInput): string {
  const v = tokenValues(input)
  return String(input.body ?? '').replace(/\{[^{}\s]+\}/g, (t) => (t in v ? v[t]! : t))
}

export function unknownTokens(body: string): string[] {
  const out: string[] = []
  for (const m of String(body).matchAll(/\{[^{}\s]+\}/g)) if (!KNOWN_TOKENS.includes(m[0]) && !out.includes(m[0])) out.push(m[0])
  return out
}

/** Badge count: size of the list behind the first names token (null when the template lists no names). */
export function namesCountFor(body: string, lists: ShareLists): number | null {
  const m = /\{(names(?:\.(\w+))?|notSet|set)\}/.exec(String(body))
  if (!m) return null
  if (m[1] === 'set') return lists.set.length
  if (m[1] === 'notSet' || m[1] === 'names') return lists.notSet.length
  const b = m[2] as Bucket
  return BUCKETS.includes(b) ? lists[b].length : null
}

export function previewLines(text: string, max = PREVIEW_MAX_LINES): { lines: string[]; more: number } {
  const all = String(text).split('\n')
  if (all.length <= max + 1) return { lines: all, more: 0 }
  return { lines: all.slice(0, max), more: all.length - max }
}

export function waMeUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

// ── CRUD ────────────────────────────────────────────────────────────────

const clip = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX).trim()

/** Unique, ≤24-char name ("Pending" → "Pending 2"). `selfId` is ignored when checking clashes. */
export function uniqueName(templates: ShareTemplate[], wanted: string, selfId?: string): string {
  const base = clip(wanted) || 'Template'
  const taken = new Set(templates.filter((t) => t.id !== selfId).map((t) => t.name.toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  for (let n = 2; ; n++) {
    const suf = ` ${n}`
    const cand = base.slice(0, NAME_MAX - suf.length).trimEnd() + suf
    if (!taken.has(cand.toLowerCase())) return cand
  }
}

let idSeq = 0
export function newTemplateId(): string {
  idSeq++
  return `t${Date.now().toString(36)}${idSeq.toString(36)}`
}

export const NEW_TEMPLATE_BODY = '{class} • {date}\n{names}'

export function addTemplate(s: ShareState, name = 'New template', body = NEW_TEMPLATE_BODY): ShareState {
  const t: ShareTemplate = { id: newTemplateId(), name: uniqueName(s.templates, name), body }
  return { ...s, templates: [...s.templates, t] }
}

export function renameTemplate(s: ShareState, id: string, name: string): ShareState {
  if (!clip(name)) return s
  const nm = uniqueName(s.templates, name, id)
  return { ...s, templates: s.templates.map((t) => (t.id === id ? { ...t, name: nm } : t)) }
}

export function setTemplateBody(s: ShareState, id: string, body: string): ShareState {
  return { ...s, templates: s.templates.map((t) => (t.id === id ? { ...t, body } : t)) }
}

export function duplicateTemplate(s: ShareState, id: string): ShareState {
  const i = s.templates.findIndex((t) => t.id === id)
  if (i < 0) return s
  const src = s.templates[i]!
  const copy: ShareTemplate = { id: newTemplateId(), name: uniqueName(s.templates, src.name), body: src.body }
  const templates = [...s.templates]
  templates.splice(i + 1, 0, copy)
  return { ...s, templates }
}

export function moveTemplate(s: ShareState, from: number, to: number): ShareState {
  if (from === to || from < 0 || from >= s.templates.length) return s
  const templates = [...s.templates]
  const [t] = templates.splice(from, 1)
  templates.splice(Math.max(0, Math.min(to, templates.length)), 0, t!)
  return { ...s, templates }
}

export function deleteTemplate(s: ShareState, id: string): ShareState {
  if (s.templates.length <= 1 || !s.templates.some((t) => t.id === id)) return s
  const templates = s.templates.filter((t) => t.id !== id)
  const defaultId = s.defaultId === id || !templates.some((t) => t.id === s.defaultId) ? templates[0]!.id : s.defaultId
  const lastUsedId = s.lastUsedId === id ? defaultId : s.lastUsedId
  return { ...s, templates, defaultId, lastUsedId }
}

export function restoreDefaults(s: ShareState): ShareState {
  const have = new Set(s.templates.map((t) => t.id))
  const add = SEED_TEMPLATES.filter((t) => !have.has(t.id)).map((t) => ({ ...t, name: uniqueName(s.templates, t.name) }))
  return add.length ? { ...s, templates: [...s.templates, ...add] } : s
}

/** Template to preselect in the chooser: last used → default → first. */
export function pickInitial(s: ShareState): ShareTemplate | undefined {
  return s.templates.find((t) => t.id === s.lastUsedId) ?? s.templates.find((t) => t.id === s.defaultId) ?? s.templates[0]
}

// ── Migration ──────────────────────────────────────────────────────────

/** v0.21 prefs (`sow.prefs.v1`): `share.template` (single) + `share.includeClassPrefix`. */
export function migrateLegacyShare(legacy: Record<string, unknown> | null | undefined): {
  templates: ShareTemplate[]
  includeClassPrefix: boolean
  /** Legacy object minus `share.template` (write back), or null when nothing to drop. */
  legacyRest: Record<string, unknown> | null
} {
  const templates = SEED_TEMPLATES.map((t) => ({ ...t }))
  if (!legacy || typeof legacy !== 'object') return { templates, includeClassPrefix: false, legacyRest: null }
  const raw = legacy['share.template']
  if (typeof raw === 'string' && raw.trim() && raw !== DEFAULT_PENDING_BODY) templates[0] = { ...templates[0]!, body: raw }
  const includeClassPrefix = legacy['share.includeClassPrefix'] === true
  let legacyRest: Record<string, unknown> | null = null
  if ('share.template' in legacy) {
    legacyRest = { ...legacy }
    delete legacyRest['share.template']
  }
  return { templates, includeClassPrefix, legacyRest }
}
