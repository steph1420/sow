import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  listMarks,
  listSessions,
  rosterWithLeft,
  type ClassKey,
} from '../db'
import { loadPrefs, subscribePrefs, type OverviewFilterStyle } from '../lib/sowPrefs'
import { sheetDateSortKey, shortDateLabel } from '../lib/shortDate'
import '../styles/shell.css'
import '../styles/overview.css'

type GradeFilter = 'all' | 'KGA' | 'KGB'

type SessionCard = {
  id: string
  classKey: ClassKey
  grade: 'KGA' | 'KGB'
  title: string
  date: string
  topic: string
  setCount: number
  subCount: number
  active: number
  pct: number
}

const GRADES: GradeFilter[] = ['all', 'KGA', 'KGB']

function classTitle(key: ClassKey): string {
  const label = CLASS_LABELS[key]
  const [grade, ...rest] = label.split(' ')
  return `${grade} · ${rest.join(' ')}`
}

function gradeOf(key: ClassKey): 'KGA' | 'KGB' {
  return key.startsWith('KGB') ? 'KGB' : 'KGA'
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100)
  const color = pct < 50 ? 'var(--warn)' : 'var(--ok)'
  return (
    <svg className="ov-ring" width="52" height="52" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central">
        {pct}%
      </text>
    </svg>
  )
}

export default function OverviewPage() {
  const nav = useNavigate()
  const [cards, setCards] = useState<SessionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [grade, setGrade] = useState<GradeFilter>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterStyle, setFilterStyle] = useState<OverviewFilterStyle>(
    () => loadPrefs()['overview.filterStyle'],
  )
  useEffect(() => subscribePrefs((p) => setFilterStyle(p['overview.filterStyle'])), [])
  const [shareFlash, setShareFlash] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const out: SessionCard[] = []
    for (const key of CLASS_KEYS) {
      const [sessions, roster, marks] = await Promise.all([
        listSessions(key),
        rosterWithLeft(key),
        listMarks(key),
      ])
      const active = roster.filter((s) => !s.left)
      const markMap = new Map(marks.map((m) => [`${m.roll}|${m.date}`, m]))
      const sess = sessions[0]
      if (!sess) continue
      const slots: { date: string; topic: string }[] = []
      if (sess.date1) slots.push({ date: sess.date1, topic: sess.topic1 || '' })
      if (sess.date2) slots.push({ date: sess.date2, topic: sess.topic2 || '' })
      for (const slot of slots) {
        let setCount = 0
        let subCount = 0
        for (const s of active) {
          const m = markMap.get(`${s.roll}|${slot.date}`)
          if (m?.set) setCount++
          if (m?.submitted) subCount++
        }
        const total = active.length
        const pct = total === 0 ? 0 : Math.round((setCount / total) * 100)
        out.push({
          id: `${key}|${slot.date}`,
          classKey: key,
          grade: gradeOf(key),
          title: classTitle(key),
          date: slot.date,
          topic: slot.topic,
          setCount,
          subCount,
          active: total,
          pct,
        })
      }
    }
    out.sort((a, b) => {
      const dk = sheetDateSortKey(b.date) - sheetDateSortKey(a.date)
      if (dk !== 0) return dk
      return CLASS_KEYS.indexOf(a.classKey) - CLASS_KEYS.indexOf(b.classKey)
    })
    setCards(out)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const dateChips = useMemo(() => {
    const seen = new Set<string>()
    const dates: string[] = []
    for (const c of cards) {
      if (!seen.has(c.date)) {
        seen.add(c.date)
        dates.push(c.date)
      }
    }
    dates.sort((a, b) => sheetDateSortKey(b) - sheetDateSortKey(a))
    return dates
  }, [cards])

  const visible = useMemo(() => {
    return cards.filter((c) => {
      if (grade !== 'all' && c.grade !== grade) return false
      if (dateFilter !== 'all' && c.date !== dateFilter) return false
      return true
    })
  }, [cards, grade, dateFilter])

  function toggleExpand(id: string) {
    setExpanded((cur) => (cur === id ? null : id))
  }

  async function onShare(card: SessionCard) {
    const lines = [
      `${CLASS_LABELS[card.classKey]} · ${shortDateLabel(card.date)}`,
      card.topic || undefined,
      `Set ${card.setCount}/${card.active} · Submitted ${card.subCount}`,
    ].filter(Boolean) as string[]
    const text = lines.join('\n')
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text })
        return
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareFlash(card.id)
      window.setTimeout(() => setShareFlash((cur) => (cur === card.id ? null : cur)), 1600)
    } catch {
      window.prompt('Copy share text:', text)
    }
  }

  function openChecklist(card: SessionCard) {
    nav(`/checklist?class=${card.classKey}`)
  }

  const chipClass = (on: boolean) => `ov-chip${on ? ` on ${filterStyle}` : ''}`

  return (
    <div className="ov-page shell-page">
      <h2 className="page-title">Overview</h2>

      <div className="ov-filters" role="toolbar" aria-label="Filter sessions">
        {GRADES.map((g) => (
          <button
            key={`g-${g}`}
            type="button"
            className={chipClass(grade === g)}
            aria-pressed={grade === g}
            onClick={() => setGrade(g)}
          >
            {g === 'all' ? 'All' : g}
          </button>
        ))}
        <span className="ov-sep" aria-hidden>
          |
        </span>
        <button
          type="button"
          className={chipClass(dateFilter === 'all')}
          aria-pressed={dateFilter === 'all'}
          onClick={() => setDateFilter('all')}
        >
          All
        </button>
        {dateChips.map((d) => (
          <button
            key={`d-${d}`}
            type="button"
            className={chipClass(dateFilter === d)}
            aria-pressed={dateFilter === d}
            onClick={() => setDateFilter(d)}
          >
            {shortDateLabel(d)}
          </button>
        ))}
      </div>

      {loading ? <p className="ov-loading">Loading sessions…</p> : null}

      {!loading && visible.length === 0 ? (
        <div className="ov-empty">No sessions yet. Sync or open Checklist to set dates.</div>
      ) : null}

      <div className="ov-list">
        {visible.map((card) => {
          const open = expanded === card.id
          const dateLbl = shortDateLabel(card.date)
          const ratio = `${card.setCount}/${card.active}`
          const topicBit = card.topic.trim()
          const collapsedLine = topicBit
            ? `${dateLbl} · ${ratio} · ${topicBit}`
            : `${dateLbl} · ${ratio}`
          return (
            <article key={card.id} className={`ov-card${open ? ' open' : ''}`}>
              <button
                type="button"
                className="ov-card-main"
                aria-expanded={open}
                onClick={() => toggleExpand(card.id)}
              >
                <div className="ov-card-body">
                  <p className="ov-card-title">{card.title}</p>
                  <p className="ov-card-line">
                    {open ? (
                      <>
                        {dateLbl} · <span className="strong">{ratio}</span>
                      </>
                    ) : (
                      collapsedLine
                    )}
                  </p>
                </div>
                <ProgressRing pct={card.pct} />
              </button>

              {open ? (
                <div className="ov-card-expand">
                  {topicBit ? <p className="ov-topic-full">{topicBit}</p> : null}
                  <div className="ov-status">
                    <span className="ov-pill set">Set {card.setCount}</span>
                    <span className="ov-pill sub">Submitted {card.subCount}</span>
                  </div>
                  <div className="ov-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        openChecklist(card)
                      }}
                    >
                      Open Checklist
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation()
                        void onShare(card)
                      }}
                    >
                      {shareFlash === card.id ? 'Copied' : 'Share'}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
