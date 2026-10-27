import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WA_TEMPLATE,
  buildWaMessage,
  buildWaNameLists,
  escapePrefsTemplate,
  formatClassForShare,
  pendingStudentNames,
  unescapePrefsTemplate,
  waMeUrl,
} from './waShare'

describe('waShare', () => {
  it('builds locked default message without class prefix', () => {
    const text = buildWaMessage({
      classLabel: 'KGA Eng CW',
      date: '28/10',
      names: ['Sahil', 'Shaurya', 'Siya'],
      includeClassPrefix: false,
    })
    expect(text).toBe(
      'Eng CW • 28/10 • not set/found (3):\nSahil\nShaurya\nSiya',
    )
  })

  it('includes grade when prefix on', () => {
    const text = buildWaMessage({
      template: DEFAULT_WA_TEMPLATE,
      classLabel: 'KGB Eng HW',
      date: '14/10',
      names: ['A'],
      includeClassPrefix: true,
    })
    expect(text.startsWith('KGB Eng HW • 14/10 • not set/found (1):')).toBe(true)
  })

  it('fills topic variable', () => {
    const text = buildWaMessage({
      template: '{class} • {topic} • ({count})\n{names}',
      classLabel: 'KGA Eng CW',
      date: '1/1',
      topic: 'Quiz',
      names: ['X'],
      includeClassPrefix: false,
    })
    expect(text).toBe('Eng CW • Quiz • (1)\nX')
  })

  it('fills detailed name/count placeholders without eating {names}', () => {
    const text = buildWaMessage({
      template: 'NS {count.notSet}:{names.notSet}|S {count.set}:{names.set}|{notSet}',
      classLabel: 'KGA Eng CW',
      date: '28/10',
      names: ['A'],
      lists: {
        notSet: ['A', 'B'],
        set: ['C'],
        notSubmitted: [],
        submitted: [],
        active: ['A', 'B', 'C'],
        left: ['D'],
      },
      includeClassPrefix: false,
    })
    expect(text).toBe('NS 2:A\nB|S 1:C|A\nB')
  })

  it('buildWaNameLists buckets roster', () => {
    const roster = [
      { roll: 1, name: 'A', left: false },
      { roll: 2, name: 'B', left: false },
      { roll: 3, name: 'C', left: true },
    ]
    const marks = [
      { roll: 1, date: '28/10', set: true, submitted: true },
      { roll: 2, date: '28/10', set: false, submitted: false },
    ]
    const lists = buildWaNameLists(roster, marks, '28/10')
    expect(lists.notSet).toEqual(['B'])
    expect(lists.set).toEqual(['A'])
    expect(lists.submitted).toEqual(['A'])
    expect(lists.notSubmitted).toEqual(['B'])
    expect(lists.active).toEqual(['A', 'B'])
    expect(lists.left).toEqual(['C'])
  })

  it('formatClassForShare strips grade', () => {
    expect(formatClassForShare('KGA Eng CW', false)).toBe('Eng CW')
    expect(formatClassForShare('KGA Eng CW', true)).toBe('KGA Eng CW')
  })

  it('waMeUrl encodes text', () => {
    const u = waMeUrl('Eng CW • hi')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(u).toContain(encodeURIComponent('Eng CW • hi'))
  })

  it('pendingStudentNames filters not-set', () => {
    const roster = [
      { roll: 1, name: 'A', left: false },
      { roll: 2, name: 'B', left: false },
      { roll: 3, name: 'C', left: true },
    ]
    const marks = [
      { roll: 1, date: '28/10', set: true, submitted: false },
      { roll: 2, date: '28/10', set: false, submitted: false },
    ]
    expect(pendingStudentNames(roster, marks, '28/10', 'notSet')).toEqual(['B'])
    expect(pendingStudentNames(roster, marks, '28/10', 'notFound')).toEqual(['A', 'B'])
  })

  it('escapes template newlines for prefs export', () => {
    const raw = '{class}\n{names}'
    expect(unescapePrefsTemplate(escapePrefsTemplate(raw))).toBe(raw)
  })
})
