import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  // Filter chips derive from real sessions (t158u) — no hardcoded Math.
  const ovGroups = useMemo(() => [...new Set(sessions.map((s) => s.group))].sort(), [sessions])
  const ovSubjects = useMemo(() => [...new Set(sessions.map((s) => s.subject as string))], [sessions])
  const [dateF, setDateF] = useState<DateFilter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const match = sessions.find((s) => s.classKey === activeClassKey)
    return match?.id ?? sessions[0]?.id ?? null
  })

  const dateChips = useMemo(() => {
    // P2-2: key by ISO date, label "Wed 28/10" (month disambiguates 7/10 vs 28/10), oldest → newest
    const byIso = new Map<string, string>()
    for (const s of sessions) byIso.set(s.date.date, `${s.date.dayLabel.split(' ')[0]} ${s.date.dayNum}`)
    return [['All', 'All'], ...[...byIso.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))] as [DateFilter, string][]
  }, [sessions])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (group === 'KGA' || group === 'KGB') {
        if (s.group !== group) return false
      }
      if (subject !== 'All' && s.subject !== subject) return false
      if (dateF !== 'All' && s.date.date !== dateF) return false
      return true
    })
  }, [sessions, group, subject, dateF])

  // P2-2: edge fade hints that the chip row scrolls
  const filtersRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ l: false, r: false })
  const updateFade = useCallback(() => {
    const e = filtersRef.current
    if (!e) return
    const l = e.scrollLeft > 2
    const r = e.scrollLeft + e.clientWidth < e.scrollWidth - 2
    setFade((f) => (f.l === l && f.r === r ? f : { l, r }))
  }, [])
  useEffect(() => {
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade, dateChips, ovGroups, ovSubjects])

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

      <div className={`ov-filters${fade.l ? ' fade-l' : ''}${fade.r ? ' fade-r' : ''}`} ref={filtersRef} onScroll={updateFade}>
        <div className="ov-slide">
          {(['All', ...ovGroups, ...ovSubjects] as string[]).map((g) => {
            const isOn =
              g === 'All'
                ? group === 'All' && subject === 'All'
                : ovSubjects.includes(g)
                  ? subject === g
                  : group === g
            const handle = () => {
              if (ovSubjects.includes(g)) {
                setSubject(g as SubjectFilter)
                setGroup('All')
              } else if (g === 'All') {
                setGroup('All')
                setSubject('All')
              } else {
                setGroup(g as GroupFilter)
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
          {dateChips.map(([d, label]) => (
            <button
              key={d}
              type="button"
              className={`ov-f${dateF === d ? ' on' : ''}`}
              onClick={() => setDateF(d)}
            >
              {label}
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
