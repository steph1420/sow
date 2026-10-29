import { useMemo, useState } from 'react'
import type { SubjectId } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { progressForSession } from '../demo/workspaceData'
import { SessionCard } from './SessionCard'
import './overview.css'

type GroupFilter = 'All' | 'KGA' | 'KGB'
type SubjectFilter = 'All' | SubjectId
type DateFilter = 'All' | string // dayLabel or All

type Props = {
  onOpenChecklist: () => void
}

/**
 * Overview — entry portal / home (Portal IA + pretty accordion).
 * Flat Classes list · expand in place · no Now-marking promote (Steve t142/t144).
 */
export function OverviewPage({ onOpenChecklist }: Props) {
  const { sessions, fromSheet, marksByClass, rosterFor, setActiveClassKey, activeClassKey } = useWorkspace()
  const [group, setGroup] = useState<GroupFilter>('All')
  const [subject, setSubject] = useState<SubjectFilter>('All')
  const [dateF, setDateF] = useState<DateFilter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const match = sessions.find((s) => s.classKey === activeClassKey)
    return match?.id ?? sessions[0]?.id ?? null
  })

  const dateChips = useMemo(() => {
    const labels = [...new Set(sessions.map((s) => s.date.dayLabel))]
    return ['All', ...labels] as DateFilter[]
  }, [sessions])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (group === 'KGA' || group === 'KGB') {
        if (s.group !== group) return false
      }
      if (subject !== 'All' && s.subject !== subject) return false
      if (dateF !== 'All' && s.date.dayLabel !== dateF) return false
      return true
    })
  }, [sessions, group, subject, dateF])

  const subLine = useMemo(() => {
    const d = sessions[0]?.date
    if (!d) return 'No sessions yet · Sync to pull from the Sheet'
    return `${d.dayNum} · pick a class to mark${fromSheet ? '' : ' · demo'}`
  }, [sessions, fromSheet])

  const toggleExpand = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id))
  }

  return (
    <div className="ov-page">
      <div className="ov-hero">
        <div className="ov-eyebrow">Home</div>
        <div className="ov-title">Overview</div>
        <div className="ov-sub">{subLine}</div>
      </div>

      <div className="ov-filters">
        <div className="ov-slide">
          {(['All', 'KGA', 'KGB', 'Eng', 'Math'] as const).map((g) => {
            const isOn =
              g === 'All'
                ? group === 'All' && subject === 'All'
                : g === 'Eng' || g === 'Math'
                  ? subject === g
                  : group === g
            const handle = () => {
              if (g === 'Eng' || g === 'Math') {
                setSubject(g)
                setGroup('All')
              } else if (g === 'All') {
                setGroup('All')
                setSubject('All')
              } else {
                setGroup(g)
                setSubject('All')
              }
            }
            return (
              <button
                key={g}
                type="button"
                className={`ov-f${isOn ? ' on' : ''}`}
                onClick={handle}
              >
                {g}
              </button>
            )
          })}
        </div>
        <div className="ov-div" />
        <div className="ov-slide">
          {dateChips.map((d) => (
            <button
              key={d}
              type="button"
              className={`ov-f${dateF === d ? ' on' : ''}`}
              onClick={() => setDateF(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ov-empty">No sessions match these filters.</div>
      ) : (
        <div className="ov-list" aria-label="Classes">
          {filtered.map((s) => {
            const prog = progressForSession(
              marksByClass[s.classKey],
              rosterFor(s.classKey),
              s.date.date,
            )
            const expanded = expandedId === s.id
            return (
              <SessionCard
                key={s.id}
                session={s}
                progress={prog}
                expanded={expanded}
                onExpand={() => toggleExpand(s.id)}
                onOpenChecklist={() => {
                  setActiveClassKey(s.classKey)
                  setExpandedId(s.id)
                  onOpenChecklist()
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
