/** v0.40.0 (t83u): per-session topic edits — kept locally until a bridge that understands them confirms. */
import type { DateSlot } from '../checklist/types'

export type TopicEdit = { topic: string; updatedAt: string }
export type TopicEdits = Record<string, TopicEdit>
export type PushSession = { subjectKey: string; date: string; topic: string; updatedAt: string }

export const topicKey = (classKey: string, date: string) => `${classKey}|${date}`

export function sessionOps(edits: TopicEdits): PushSession[] {
  return Object.entries(edits).map(([k, v]) => {
    const [subjectKey, date] = k.split('|') as [string, string]
    return { subjectKey, date, topic: v.topic, updatedAt: v.updatedAt }
  })
}

/** sessionsApplied undefined ⇒ bridge predates v0.40.0: keep everything pending. */
export function remainingAfterPush(current: TopicEdits, sent: TopicEdits, sessionsApplied: number | undefined): TopicEdits {
  if (sessionsApplied === undefined) return { ...current }
  const out: TopicEdits = {}
  for (const [k, v] of Object.entries(current)) if (!sent[k] || v.updatedAt > sent[k]!.updatedAt) out[k] = v
  return out
}

export function applyTopicEdits<T extends DateSlot>(classKey: string, slots: T[], edits: TopicEdits | undefined): T[] {
  if (!edits) return slots
  return slots.map((d) => { const e = edits[topicKey(classKey, d.date)]; return e ? { ...d, topic: e.topic } : d })
}
