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
 * Overview — Quiet Lucid cards (lucid-mj2).
 * Open Checklist is the power move.
 */
export function OverviewPage({ onOpenChecklist }: Props) {
  const { sessions, marksByClass, rosterFor, setActiveClassKey } = useWorkspace()
  const [group, setGroup] = useState<GroupFilter>('All')
  const [dateF, setDateF] = useState<DateFilter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id ?? null)
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

  return (
    <div className="ov-page">
      <div className="ov-title">Overview</div>

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

      <div className="ov-list">
        {filtered.length === 0 ? (
          <div className="ov-empty">No sessions match these filters.</div>
        ) : (
          filtered.map((s) => {
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
                expanded={expandedId === s.id}
                onExpand={() => setExpandedId((id) => (id === s.id ? null : s.id))}
                onOpenChecklist={() => {
                  setActiveClassKey(s.classKey)
                  onOpenChecklist()
                }}
                onShare={() => {
                  setShareNote(`Share for ${s.label} — Phase D / Sync.`)
                  window.setTimeout(() => setShareNote(null), 2200)
                }}
              />
            )
          })
        )}
      </div>

      {shareNote ? (
        <div className="ov-empty" role="status">
          {shareNote}
        </div>
      ) : null}
    </div>
  )
}
