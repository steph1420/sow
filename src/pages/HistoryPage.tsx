import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  listMarks,
  listSessions,
  rosterWithLeft,
  type ClassKey,
} from '../db'
import { parseClassParam } from '../lib/classMeta'
import { historyDateLabel, sheetDateSortKey } from '../lib/shortDate'
import '../styles/shell.css'
import '../styles/history.css'

type GradeFilter = 'all' | 'KGA' | 'KGB'
type KindFilter = 'all' | 'CW' | 'HW'

type HistCard = {
  id: string
  classKey: ClassKey
  grade: 'KGA' | 'KGB'
  kind: 'CW' | 'HW'
  title: string
  date: string
  topic: string
  setCount: number
  subCount: number
  active: number
  pct: number
}

function classTitle(key: ClassKey): string {
  const label = CLASS_LABELS[key]
  const [grade, ...rest] = label.split(' ')
  return `${grade} · ${rest.join(' ')}`
}

function gradeOf(key: ClassKey): 'KGA' | 'KGB' {
  return key.startsWith('KGB') ? 'KGB' : 'KGA'
}

function kindOf(key: ClassKey): 'CW' | 'HW' {
  return key.endsWith('_HW') ? 'HW' : 'CW'
}

export default function HistoryPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const seedKey = parseClassParam(params.get('class'))
  const [grade, setGrade] = useState<GradeFilter>(() =>
    seedKey ? gradeOf(seedKey) : 'all',
  )
  const [kind, setKind] = useState<KindFilter>(() =>
    seedKey ? kindOf(seedKey) : 'all',
  )
  const [cards, setCards] = useState<HistCard[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const out: HistCard[] = []
    const seen = new Set<string>()
    for (const key of CLASS_KEYS) {
      const [sessions, roster, marks] = await Promise.all([
        listSessions(key),
        rosterWithLeft(key),
        listMarks(key),
      ])
      const active = roster.filter((s) => !s.left)
      const markMap = new Map(marks.map((m) => [`${m.roll}|${m.date}`, m]))
      for (const sess of sessions) {
        const slots: { date: string; topic: string }[] = []
        if (sess.date1) slots.push({ date: sess.date1, topic: sess.topic1 || '' })
        if (sess.date2) slots.push({ date: sess.date2, topic: sess.topic2 || '' })
        for (const slot of slots) {
          const id = `${key}|${slot.date}`
          if (seen.has(id)) continue
          seen.add(id)
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
            id,
            classKey: key,
            grade: gradeOf(key),
            kind: kindOf(key),
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

  const visible = useMemo(() => {
    return cards.filter((c) => {
      if (grade !== 'all' && c.grade !== grade) return false
      if (kind !== 'all' && c.kind !== kind) return false
      return true
    })
  }, [cards, grade, kind])

  function chipClass(on: boolean) {
    return `hist-chip${on ? ' on' : ''}`
  }

  return (
    <div className="shell-page hist-page">
      <div className="hist-top">
        <Link className="back" to="/overview">
          ← More
        </Link>
        <h2 className="page-title hist-title">History</h2>
        <span className="hist-top-spacer" aria-hidden />
      </div>

      <div className="hist-chips" role="toolbar" aria-label="Filter history">
        <button
          type="button"
          className={chipClass(grade === 'all' && kind === 'all')}
          onClick={() => {
            setGrade('all')
            setKind('all')
          }}
        >
          All
        </button>
        {(['KGA', 'KGB'] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={chipClass(grade === g)}
            onClick={() => setGrade((cur) => (cur === g ? 'all' : g))}
          >
            {g}
          </button>
        ))}
        {(['CW', 'HW'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={chipClass(kind === k)}
            onClick={() => setKind((cur) => (cur === k ? 'all' : k))}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="hist-list">
        {loading ? <div className="empty-soft">Loading…</div> : null}
        {!loading &&
          visible.map((c) => (
            <button
              key={c.id}
              type="button"
              className="hist-card-v2"
              onClick={() => nav(`/checklist?class=${c.classKey}`)}
            >
              <div className="hist-card-top">
                <span className="hist-card-title">{c.title}</span>
                <span className="hist-card-pct">{c.pct}%</span>
              </div>
              <p className="hist-card-meta">
                <span className="hist-card-date">{historyDateLabel(c.date)}</span>
                <span className="hist-card-dot" aria-hidden>
                  ·
                </span>
                <span>
                  {c.setCount}/{c.active} set · {c.subCount} submitted
                </span>
              </p>
              {c.topic ? <p className="hist-card-topic">{c.topic}</p> : null}
            </button>
          ))}
        {!loading && visible.length === 0 ? (
          <div className="empty-soft">No sessions yet for this filter.</div>
        ) : null}
      </div>
    </div>
  )
}
