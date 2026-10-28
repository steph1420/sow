import { useMemo, useState } from 'react'
import { useWorkspace } from '../demo/WorkspaceContext'
import { progressForSession, WORKSPACE_DATES } from '../demo/workspaceData'
import { SessionCard } from './SessionCard'
import './overview.css'

type GroupFilter = 'All' | 'KGA' | 'KGB' | 'CW' | 'HW'
type DateFilter = 'All' | string // dayLabel or All

type Props = {
  onOpenChecklist: () => void
}

/**
 * Overview — entry portal / home (Portal IA portal-mj1).
 * Pick class · date · topic · Open Checklist.
 */
export function OverviewPage({ onOpenChecklist }: Props) {
  const { sessions, marksByClass, rosterFor, setActiveClassKey, activeClassKey } = useWorkspace()
  const [group, setGroup] = useState<GroupFilter>('All')
  const [dateF, setDateF] = useState<DateFilter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const match = sessions.find((s) => s.classKey === activeClassKey)
    return match?.id ?? sessions[0]?.id ?? null
  })
  const [shareNote, setShareNote] = useState<string | null>(null)

  const dateChips = useMemo(() => {
    const labels = WORKSPACE_DATES.map((d) => d.dayLabel)
    return ['All', ...labels] as DateFilter[]
  }, [])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (group === 'KGA' || group === 'KGB') {
        if (s.group !== group) return false
      } else if (group === 'CW' || group === 'HW') {
        if (s.kind !== group) return false
      }
      if (dateF !== 'All' && s.date.dayLabel !== dateF) return false
      return true
    })
  }, [sessions, group, dateF])

  const nowMarking = useMemo(() => {
    if (!filtered.length) return null
    const exp = filtered.find((s) => s.id === expandedId)
    return exp ?? filtered[0]!
  }, [filtered, expandedId])

  const others = useMemo(() => {
    if (!nowMarking) return []
    return filtered.filter((s) => s.id !== nowMarking.id)
  }, [filtered, nowMarking])

  const subLine = useMemo(() => {
    const d = WORKSPACE_DATES[0]
    return `${d.dayLabel} Oct · pick a class to mark`
  }, [])

  const renderCard = (s: (typeof sessions)[0], expanded: boolean) => {
    const prog = progressForSession(
      marksByClass[s.classKey],
      rosterFor(s.classKey),
      s.date.date,
    )
    return (
      <SessionCard
        key={s.id}
        session={s}
        progress={prog}
        expanded={expanded}
        onExpand={() => setExpandedId(s.id)}
        onOpenChecklist={() => {
          setActiveClassKey(s.classKey)
          setExpandedId(s.id)
          onOpenChecklist()
        }}
        onShare={() => {
          setShareNote(`Share for ${s.label} — Sync.`)
          window.setTimeout(() => setShareNote(null), 2200)
        }}
      />
    )
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
          {(['All', 'KGA', 'KGB', 'CW'] as GroupFilter[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`ov-f${group === g ? ' on' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
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
        <div className="ov-list">
          {nowMarking ? (
            <>
              <div className="ov-section-lbl">Now marking</div>
              {renderCard(nowMarking, true)}
            </>
          ) : null}
          {others.length ? (
            <>
              <div className="ov-section-lbl">Other classes</div>
              {others.map((s) => renderCard(s, false))}
            </>
          ) : null}
        </div>
      )}

      {shareNote ? (
        <div className="ov-empty" role="status">
          {shareNote}
        </div>
      ) : null}
    </div>
  )
}
