import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CLASS_KEYS,
  listMarks,
  listSessions,
  rosterWithLeft,
  type ClassKey,
} from '../db'
import { splitClass } from '../lib/classMeta'
import '../styles/shell.css'

type Card = { key: ClassKey; pending: number | null; allSet: boolean }

export default function HomePage() {
  const nav = useNavigate()
  const [cards, setCards] = useState<Card[]>([])

  useEffect(() => {
    ;(async () => {
      const out: Card[] = []
      for (const key of CLASS_KEYS) {
        const [sessions, roster] = await Promise.all([listSessions(key), rosterWithLeft(key)])
        const sess = sessions[0]
        const active = roster.filter((s) => !s.left)
        if (!sess || active.length === 0) {
          out.push({ key, pending: null, allSet: false })
          continue
        }
        const dates = [sess.date1, sess.date2].filter(Boolean)
        const marks = await listMarks(key)
        const map = new Map(marks.map((m) => [`${m.roll}|${m.date}`, m]))
        let pending = 0
        for (const s of active) {
          for (const d of dates) {
            if (!map.get(`${s.roll}|${d}`)?.set) pending++
          }
        }
        out.push({ key, pending, allSet: pending === 0 })
      }
      setCards(out)
    })()
  }, [])

  return (
    <div className="shell-page">
      <p className="eyebrow">Setting of Work</p>
      <h2 className="page-title">Classes</h2>
      <div className="grid-2">
        {cards.map((c) => {
          const meta = splitClass(c.key)
          const stat =
            c.pending === null ? 'No session' : c.allSet ? 'All set' : `${c.pending} pending`
          return (
            <button
              key={c.key}
              type="button"
              className="class-card"
              onClick={() => nav(`/session?class=${c.key}`)}
            >
              <span className="grade">{meta.grade}</span>
              <span className="kind">{meta.kind}</span>
              <span className="stat">{stat}</span>
            </button>
          )
        })}
      </div>
      <p className="foot-note">
        Tap a class to set the session, then Mark.{' '}
        <Link to="/history" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          History
        </Link>
      </p>
    </div>
  )
}
