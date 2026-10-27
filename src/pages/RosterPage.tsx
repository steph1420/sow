import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  rosterWithLeft,
  setLeft,
} from '../db'
import { parseClassParam, splitClass } from '../lib/classMeta'
import '../styles/shell.css'

type Filter = 'all' | 'left'

export default function RosterPage() {
  const [params, setParams] = useSearchParams()
  const classKey = parseClassParam(params.get('class')) ?? 'KGA_Eng_CW'
  const [rows, setRows] = useState<Awaited<ReturnType<typeof rosterWithLeft>>>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [otherLeft, setOtherLeft] = useState<string>('')

  const reload = useCallback(async () => {
    const list = await rosterWithLeft(classKey)
    setRows(list)
    // footnote: Left kids in the sibling CW/HW of other section
    const others = CLASS_KEYS.filter((k) => k !== classKey)
    const notes: string[] = []
    for (const k of others) {
      const ros = await rosterWithLeft(k)
      for (const s of ros.filter((r) => r.left)) {
        notes.push(`${s.name} (${CLASS_LABELS[k]})`)
      }
    }
    setOtherLeft(notes.slice(0, 3).join(' · '))
  }, [classKey])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(() => {
    const list = filter === 'left' ? rows.filter((r) => r.left) : rows
    return list.slice().sort((a, b) => a.roll - b.roll)
  }, [rows, filter])

  const meta = splitClass(classKey)

  async function toggle(roll: number, name: string, left: boolean) {
    await setLeft(classKey, roll, !left, name)
    await reload()
  }

  return (
    <div className="shell-page">
      <div className="row-top">
        <Link className="back" to="/">
          ← Home
        </Link>
        <h2 className="page-title" style={{ fontSize: 22 }}>
          Roster
        </h2>
      </div>
      <p className="sub">
        {meta.grade} · names from your sheet · Left flag in app
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

      <div className="chip-row">
        <button type="button" className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button type="button" className={`chip${filter === 'left' ? ' on' : ''}`} onClick={() => setFilter('left')}>
          Left only
        </button>
      </div>

      <div className="list">
        {visible.map((s) => (
          <div key={s.id} className={`list-row${s.left ? ' dim' : ''}`}>
            <span className="roll">{s.roll}</span>
            <span className="name">
              {s.name}
              {s.left ? <span className="badge">Left</span> : null}
            </span>
            <button
              type="button"
              className={`status tog${s.left ? ' left' : ''}`}
              onClick={() => void toggle(s.roll, s.name, s.left)}
              title="Toggle Left"
            >
              {s.left ? 'Left' : 'Active'}
            </button>
          </div>
        ))}
        {visible.length === 0 ? <div className="empty-soft">No students in this filter.</div> : null}
      </div>

      {otherLeft ? <p className="foot-note">Other classes Left: {otherLeft}</p> : null}
    </div>
  )
}
