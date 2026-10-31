import { describe, expect, it } from 'vitest'
import { applyTopicEdits, remainingAfterPush, sessionOps, topicKey } from './topicEdits'

const edits = { [topicKey('KGA_Eng_CW', '2026-10-28')]: { topic: 'Nouns ✎', updatedAt: '2026-10-30T01:00:00.000Z' } }

describe('topic edits (v0.40.0)', () => {
  it('builds push ops', () => {
    expect(sessionOps(edits)).toEqual([{ subjectKey: 'KGA_Eng_CW', date: '2026-10-28', topic: 'Nouns ✎', updatedAt: '2026-10-30T01:00:00.000Z' }])
  })
  it('new bridge (sessionsApplied present) clears what was sent', () => {
    expect(remainingAfterPush(edits, edits, 1)).toEqual({})
  })
  it('old bridge (no sessionsApplied) keeps edits pending', () => {
    expect(remainingAfterPush(edits, edits, undefined)).toEqual(edits)
  })
  it('an edit made during the push survives', () => {
    const later = { [topicKey('KGA_Eng_CW', '2026-10-28')]: { topic: 'newer', updatedAt: '2026-10-30T02:00:00.000Z' } }
    expect(remainingAfterPush(later, edits, 1)).toEqual(later)
  })
  it('overlays topics on date slots by class+date, other dates untouched', () => {
    const slots = [{ date: '2026-10-28', topic: 'Q', dayLabel: '', dayNum: '' }, { date: '2026-11-02', topic: 'R', dayLabel: '', dayNum: '' }] as const
    const out = applyTopicEdits('KGA_Eng_CW', [...slots] as never, edits)
    expect(out.map((d: { topic: string }) => d.topic)).toEqual(['Nouns ✎', 'R'])
    expect(applyTopicEdits('KGB_Eng_CW', [...slots] as never, edits).map((d: { topic: string }) => d.topic)).toEqual(['Q', 'R'])
  })
})

import { topicEditFor } from './topicEdits'
describe('v0.42.0: addSession / setTopic empty-topic consistency', () => {
  const at = '2026-10-31T04:00:00.000Z'
  it('trims and caps at 200', () => expect(topicEditFor('  Nouns  ', { exists: true, current: 'x' }, at)).toEqual({ topic: 'Nouns', updatedAt: at }))
  it('empty never wipes an existing session topic', () => expect(topicEditFor('   ', { exists: true, current: 'Nouns' }, at)).toBeNull())
  it('unchanged topic ⇒ no edit', () => expect(topicEditFor('Nouns', { exists: true, current: 'Nouns' }, at)).toBeNull())
  it('new session may have an empty topic', () => expect(topicEditFor('', { exists: false, current: '' }, at)).toEqual({ topic: '', updatedAt: at }))
})
