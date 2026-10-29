import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PENDING_BODY,
  SEED_TEMPLATES,
  addTemplate,
  buildShareLists,
  buildShareMessage,
  deleteTemplate,
  duplicateTemplate,
  migrateLegacyShare,
  moveTemplate,
  namesCountFor,
  previewLines,
  renameTemplate,
  restoreDefaults,
  unknownTokens,
  waMeUrl,
  WA_LONG_WARN,
  type ShareState,
} from './shareTemplates'

const roster = [
  { roll: 1, name: 'Aarav', left: false },
  { roll: 2, name: 'Diya', left: false },
  { roll: 3, name: 'Sahil', left: false },
  { roll: 4, name: 'Old Kid', left: true },
]
const marks = {
  '1|2026-10-28': { set: true, submitted: false },
  '2|2026-10-28': { set: true, submitted: true },
  '4|2026-10-28': { set: true, submitted: true },
}

const state = (): ShareState => ({
  templates: SEED_TEMPLATES.map((t) => ({ ...t })),
  defaultId: 'pending',
  lastUsedId: '',
  includeClassPrefix: false,
})

describe('share seeds (locked t164u)', () => {
  it('Pending is the exact old template and the default; no Parents note seed', () => {
    expect(DEFAULT_PENDING_BODY).toBe('{class} • {date} • not set/found ({count}):\n{names}')
    expect(SEED_TEMPLATES.map((t) => t.name)).toEqual(['Pending', 'Completed', 'Submitted', 'Not submitted'])
    expect(SEED_TEMPLATES[0]!.body).toBe(DEFAULT_PENDING_BODY)
    expect(SEED_TEMPLATES.some((t) => /parent/i.test(t.name))).toBe(false)
  })
})

describe('buildShareLists', () => {
  it('buckets by date, excludes left from all but left', () => {
    const L = buildShareLists(roster, marks, '2026-10-28')
    expect(L.notSet).toEqual(['Sahil'])
    expect(L.set).toEqual(['Aarav', 'Diya'])
    expect(L.submitted).toEqual(['Diya'])
    expect(L.notSubmitted).toEqual(['Aarav', 'Sahil'])
    expect(L.active).toEqual(['Aarav', 'Diya', 'Sahil'])
    expect(L.left).toEqual(['Old Kid'])
  })
})

describe('buildShareMessage', () => {
  const lists = buildShareLists(roster, marks, '2026-10-28')
  const base = { classLabel: 'KGA Eng CW', date: '28/10', topic: 'Reading', lists }
  it('locked default output, prefix stripped by default', () => {
    expect(buildShareMessage({ ...base, body: DEFAULT_PENDING_BODY })).toBe('Eng CW • 28/10 • not set/found (1):\nSahil')
  })
  it('prefix on keeps KGA', () => {
    expect(buildShareMessage({ ...base, body: '{class}', includeClassPrefix: true })).toBe('KGA Eng CW')
  })
  it('longest token first; dotted tokens; unknown stays literal', () => {
    const out = buildShareMessage({
      ...base,
      body: '{names.submitted}|{count.submitted}/{count.active}|{names}|{count.notSubmitted}|{topic}|{teacher}',
    })
    expect(out).toBe('Diya|1/3|Sahil|2|Reading|{teacher}')
  })
  it('seeds produce expected text', () => {
    const by = (n: string) => SEED_TEMPLATES.find((t) => t.name === n)!.body
    expect(buildShareMessage({ ...base, body: by('Completed') })).toBe('Eng CW • 28/10 • set (2/3):\nAarav\nDiya')
    expect(buildShareMessage({ ...base, body: by('Submitted') })).toBe('Eng CW • 28/10 • submitted (1/3):\nDiya')
    expect(buildShareMessage({ ...base, body: by('Not submitted') })).toBe('Eng CW • 28/10 • not submitted (2):\nAarav\nSahil')
  })
  it('empty list → preview mode shows (none), send mode keeps it empty', () => {
    const empty = buildShareLists(roster, { ...marks, '3|2026-10-28': { set: true, submitted: false } }, '2026-10-28')
    expect(buildShareMessage({ ...base, lists: empty, body: DEFAULT_PENDING_BODY })).toBe('Eng CW • 28/10 • not set/found (0):\n')
    expect(buildShareMessage({ ...base, lists: empty, body: DEFAULT_PENDING_BODY, emptyNames: '(none)' })).toBe(
      'Eng CW • 28/10 • not set/found (0):\n(none)',
    )
  })
})

describe('preview helpers', () => {
  it('truncates after 9 lines with “…N more”', () => {
    const text = ['head', ...Array.from({ length: 15 }, (_, i) => `n${i}`)].join('\n')
    const p = previewLines(text)
    expect(p.lines).toHaveLength(9)
    expect(p.more).toBe(7)
    expect(previewLines('a\nb').more).toBe(0)
  })
  it('names count follows the first names token', () => {
    const lists = buildShareLists(roster, marks, '2026-10-28')
    expect(namesCountFor(DEFAULT_PENDING_BODY, lists)).toBe(1)
    expect(namesCountFor('{names.set}', lists)).toBe(2)
    expect(namesCountFor('{class} only', lists)).toBeNull()
  })
  it('unknown tokens are reported', () => {
    expect(unknownTokens('{class} {foo} {names.set} {count.bar}')).toEqual(['{foo}', '{count.bar}'])
  })
  it('wa.me url + long threshold', () => {
    expect(waMeUrl('a b\nc')).toBe('https://wa.me/?text=a%20b%0Ac')
    expect(WA_LONG_WARN).toBe(1500)
  })
})

describe('template CRUD', () => {
  it('add gives unique name ≤24 chars', () => {
    const s = addTemplate(state(), 'Pending')
    expect(s.templates.at(-1)!.name).toBe('Pending 2')
    const s2 = addTemplate(state(), 'x'.repeat(40))
    expect(s2.templates.at(-1)!.name.length).toBeLessThanOrEqual(24)
  })
  it('rename: blank rejected, duplicate auto-suffixed', () => {
    const s = state()
    expect(renameTemplate(s, 'completed', '   ')).toBe(s)
    expect(renameTemplate(s, 'completed', 'Pending').templates[1]!.name).toBe('Pending 2')
    expect(renameTemplate(s, 'completed', 'Done').templates[1]!.name).toBe('Done')
  })
  it('duplicate inserts after source with “Name 2”', () => {
    const s = duplicateTemplate(state(), 'submitted')
    expect(s.templates.map((t) => t.name)).toEqual(['Pending', 'Completed', 'Submitted', 'Submitted 2', 'Not submitted'])
    expect(s.templates[3]!.body).toBe(s.templates[2]!.body)
  })
  it('move reorders', () => {
    const s = moveTemplate(state(), 2, 0)
    expect(s.templates.map((t) => t.id)).toEqual(['submitted', 'pending', 'completed', 'not-submitted'])
  })
  it('delete: last blocked, default falls to first, lastUsed falls to default', () => {
    let s: ShareState = { ...state(), lastUsedId: 'pending' }
    s = deleteTemplate(s, 'pending')
    expect(s.defaultId).toBe('completed')
    expect(s.lastUsedId).toBe('completed')
    s = deleteTemplate(deleteTemplate(deleteTemplate(s, 'completed'), 'submitted'), 'not-submitted')
    expect(s.templates).toHaveLength(1)
  })
  it('restore defaults re-adds missing builtins, keeps user templates', () => {
    let s = deleteTemplate(addTemplate(state(), 'Mine'), 'submitted')
    s = restoreDefaults(s)
    expect(s.templates.map((t) => t.name)).toEqual(['Pending', 'Completed', 'Not submitted', 'Mine', 'Submitted'])
  })
})

describe('legacy migration (share.template in sow.prefs.v1)', () => {
  it('custom legacy text seeds Pending; prefix carried', () => {
    const r = migrateLegacyShare({ 'share.template': 'Hi {class}\n{names}', 'share.includeClassPrefix': true, other: 1 })
    expect(r.templates[0]).toMatchObject({ id: 'pending', name: 'Pending', body: 'Hi {class}\n{names}' })
    expect(r.includeClassPrefix).toBe(true)
    expect(r.legacyRest).toEqual({ 'share.includeClassPrefix': true, other: 1 })
  })
  it('default legacy text or none → seeds unchanged', () => {
    expect(migrateLegacyShare({ 'share.template': DEFAULT_PENDING_BODY }).templates[0]!.body).toBe(DEFAULT_PENDING_BODY)
    expect(migrateLegacyShare(null).templates).toEqual(SEED_TEMPLATES)
    expect(migrateLegacyShare(null).includeClassPrefix).toBe(false)
  })
})
