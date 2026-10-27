/** WhatsApp share template (JB-R8 + detailed placeholders). Locked default Steve 2026-10-27. */

export const DEFAULT_WA_TEMPLATE =
  '{class} • {date} • not set/found ({count}):\n{names}'

/** Chips shown in Settings → Share template editor (insert order). */
export const WA_VARS = [
  '{class}',
  '{date}',
  '{topic}',
  '{count}',
  '{names}',
  '{count.notSet}',
  '{names.notSet}',
  '{count.set}',
  '{names.set}',
  '{count.notSubmitted}',
  '{names.notSubmitted}',
  '{count.submitted}',
  '{names.submitted}',
  '{count.active}',
  '{names.active}',
  '{count.left}',
  '{names.left}',
  '{notSet}',
  '{set}',
] as const

export type WaShareMode = 'notSet' | 'notFound'

export type WaRosterStudent = { name: string; roll: number; left?: boolean }
export type WaMark = { roll: number; set?: boolean; submitted?: boolean; date: string }

export type WaNameLists = {
  /** Alias of notSet (backward-compatible `{names}` / `{count}`). */
  notSet: string[]
  set: string[]
  notSubmitted: string[]
  submitted: string[]
  active: string[]
  left: string[]
}

export type WaShareInput = {
  /** Full class label, e.g. `KGA Eng CW`. */
  classLabel: string
  /** Sheet date as stored, e.g. `28/10`. */
  date: string
  topic?: string
  /**
   * Pending / not-set names — used for `{names}` `{count}` and as fallback
   * when detailed `lists` is omitted (Settings preview / locked default).
   */
  names: string[]
  /** Detailed buckets for richer templates. Overview passes this. */
  lists?: Partial<WaNameLists>
  /** When false (default), strip leading KGA/KGB — preview shows `Eng CW`. */
  includeClassPrefix?: boolean
  template?: string
}

/** Sample used by Settings preview when no live session is loaded. */
export const WA_PREVIEW_SAMPLE: WaShareInput = {
  classLabel: 'KGA Eng CW',
  date: '28/10',
  topic: 'Reading',
  names: ['Sahil', 'Shaurya', 'Siya'],
  includeClassPrefix: false,
  lists: {
    notSet: ['Sahil', 'Shaurya', 'Siya'],
    set: ['Aarav', 'Diya'],
    notSubmitted: ['Sahil', 'Shaurya', 'Siya', 'Aarav'],
    submitted: ['Diya'],
    active: ['Sahil', 'Shaurya', 'Siya', 'Aarav', 'Diya'],
    left: ['Old Kid'],
  },
}

export function formatClassForShare(classLabel: string, includePrefix: boolean): string {
  const label = String(classLabel ?? '').trim()
  if (includePrefix) return label
  return label.replace(/^(KGA|KGB)\s+/i, '')
}

function lines(names: string[]): string {
  return names.map((n) => String(n).trim()).filter(Boolean).join('\n')
}

function resolveLists(input: WaShareInput): WaNameLists {
  const fallbackNotSet = (input.names ?? []).map((n) => String(n).trim()).filter(Boolean)
  const L = input.lists
  return {
    notSet: (L?.notSet ?? fallbackNotSet).map((n) => String(n).trim()).filter(Boolean),
    set: (L?.set ?? []).map((n) => String(n).trim()).filter(Boolean),
    notSubmitted: (L?.notSubmitted ?? []).map((n) => String(n).trim()).filter(Boolean),
    submitted: (L?.submitted ?? []).map((n) => String(n).trim()).filter(Boolean),
    active: (L?.active ?? []).map((n) => String(n).trim()).filter(Boolean),
    left: (L?.left ?? []).map((n) => String(n).trim()).filter(Boolean),
  }
}

/**
 * Fill template placeholders.
 * `{names}` / `{count}` stay aliases for not-set pending list (locked default).
 * Also: `{names.set}` `{names.notSet}` `{set}` `{notSet}` and matching `{count.*}`.
 */
export function buildWaMessage(input: WaShareInput): string {
  const template = input.template ?? DEFAULT_WA_TEMPLATE
  const cls = formatClassForShare(input.classLabel, !!input.includeClassPrefix)
  const lists = resolveLists(input)
  const vars: Record<string, string> = {
    '{class}': cls,
    '{date}': String(input.date ?? '').trim(),
    '{topic}': String(input.topic ?? '').trim(),
    // aliases → not set
    '{count}': String(lists.notSet.length),
    '{names}': lines(lists.notSet),
    '{notSet}': lines(lists.notSet),
    '{count.notSet}': String(lists.notSet.length),
    '{names.notSet}': lines(lists.notSet),
    '{set}': lines(lists.set),
    '{count.set}': String(lists.set.length),
    '{names.set}': lines(lists.set),
    '{count.submitted}': String(lists.submitted.length),
    '{names.submitted}': lines(lists.submitted),
    '{count.notSubmitted}': String(lists.notSubmitted.length),
    '{names.notSubmitted}': lines(lists.notSubmitted),
    '{count.active}': String(lists.active.length),
    '{names.active}': lines(lists.active),
    '{count.left}': String(lists.left.length),
    '{names.left}': lines(lists.left),
  }
  // Replace longer keys first so `{names.notSet}` isn't partially eaten by `{names}`
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length)
  let out = template
  for (const key of keys) {
    out = out.split(key).join(vars[key])
  }
  return out
}

export function waMeUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** Active students missing `set` (default) or `submitted` for a date. */
export function pendingStudentNames(
  roster: WaRosterStudent[],
  marks: WaMark[],
  date: string,
  mode: WaShareMode = 'notSet',
): string[] {
  const markByRoll = new Map(
    marks.filter((m) => m.date === date).map((m) => [m.roll, m] as const),
  )
  const out: string[] = []
  for (const s of roster) {
    if (s.left) continue
    const mark = markByRoll.get(s.roll)
    const ok = mode === 'notFound' ? !!mark?.submitted : !!mark?.set
    if (!ok) out.push(s.name)
  }
  return out
}

/** Build all name buckets for a class×date (Overview Share). */
export function buildWaNameLists(
  roster: WaRosterStudent[],
  marks: WaMark[],
  date: string,
): WaNameLists {
  const markByRoll = new Map(
    marks.filter((m) => m.date === date).map((m) => [m.roll, m] as const),
  )
  const notSet: string[] = []
  const set: string[] = []
  const notSubmitted: string[] = []
  const submitted: string[] = []
  const active: string[] = []
  const left: string[] = []
  for (const s of roster) {
    if (s.left) {
      left.push(s.name)
      continue
    }
    active.push(s.name)
    const mark = markByRoll.get(s.roll)
    if (mark?.set) set.push(s.name)
    else notSet.push(s.name)
    if (mark?.submitted) submitted.push(s.name)
    else notSubmitted.push(s.name)
  }
  return { notSet, set, notSubmitted, submitted, active, left }
}

/** Escape template for prefs export (`key=value` lines). */
export function escapePrefsTemplate(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n')
}

export function unescapePrefsTemplate(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1]
      if (n === 'n') {
        out += '\n'
        i++
        continue
      }
      if (n === '\\') {
        out += '\\'
        i++
        continue
      }
    }
    out += s[i]
  }
  return out
}
