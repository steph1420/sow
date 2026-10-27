import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  listMarks,
  listSessions,
  rosterWithLeft,
  type Session,
} from '../db'
import { parseClassParam, splitClass } from '../lib/classMeta'
import '../styles/shell.css'

type Row = {
  session: Session
  label: string
  detail: string
  pct: number
}

export default function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const classKey = parseClassParam(params.get('class')) ?? 'KGA_Eng_CW'
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    ;(async () => {
      const [sessions, roster, marks] = await Promise.all([
        listSessions(classKey),
        rosterWithLeft(classKey),
        listMarks(classKey),
      ])
      const active = roster.filter((s) => !s.left)
      const markMap = new Map(marks.map((m) => [`${m.roll}|${m.date}`, m]))
      const out: Row[] = sessions
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((sess) => {
          const dates = [sess.date1, sess.date2].filter(Boolean)
          const topics = [sess.topic1, sess.topic2].filter(Boolean)
          let setCount = 0
          const slots = active.length * dates.length
          for (const s of active) {
            for (const d of dates) {
              if (markMap.get(`${s.roll}|${d}`)?.set) setCount++
            }
          }
          const pct = slots === 0 ? 0 : Math.round((setCount / slots) * 100)
          const label = dates.join(' + ')
          const topicBit = topics[0] || '—'
          const detail =
            pct === 100
              ? `${topicBit} · all set`
              : `${topicBit} · ${setCount} of ${active.length} active set`
          return { session: sess, label, detail, pct }
        })
      setRows(out)
    })()
  }, [classKey])

  const meta = splitClass(classKey)

  return (
    <div className="shell-page">
      <div className="row-top">
        <Link className="back" to="/">
          ← Home
        </Link>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          History
        </h2>
      </div>
      <p className="sub">
        {meta.grade} · {meta.kind}
      </p>

      <label className="eyebrow" style={{ display: 'block' }}>
        Class
        <select
          value={classKey}
          onChange={(e) => setParams({ class: e.target.value })}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          {CLASS_KEYS.map((k) => (
            <option key={k} value={k}>
              {CLASS_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="list">
        {rows.map((r) => (
          <button
            key={r.session.sessionId}
            type="button"
            className="hist-card"
            onClick={() => nav(`/mark?class=${classKey}`)}
          >
            <div className="body">
              <p className="dates">{r.label}</p>
              <p className="meta">{r.detail}</p>
            </div>
            <span className="pct">{r.pct}%</span>
          </button>
        ))}
        {rows.length === 0 ? <div className="empty-soft">No sessions yet for this class.</div> : null}
      </div>
    </div>
  )
}
