import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  listSessions,
  putSession,
  type ClassKey,
  type Session,
} from '../db'
import { parseClassParam, splitClass } from '../lib/classMeta'
import '../styles/shell.css'

function fresh(classKey: ClassKey): Session {
  const ts = new Date().toISOString()
  return {
    sessionId: crypto.randomUUID(),
    classKey,
    date1: '',
    topic1: '',
    date2: '',
    topic2: '',
    createdAt: ts,
    updatedAt: ts,
  }
}

export default function SessionPage() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const classKey = parseClassParam(params.get('class')) ?? 'KGA_Eng_CW'
  const [session, setSession] = useState<Session | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ date1: '', topic1: '', date2: '', topic2: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const list = await listSessions(classKey)
      const s = list[0] ?? null
      setSession(s)
      if (s) {
        setDraft({ date1: s.date1, topic1: s.topic1, date2: s.date2, topic2: s.topic2 })
        setEditing(false)
      } else {
        setDraft({ date1: '', topic1: '', date2: '', topic2: '' })
        setEditing(true)
      }
    })()
  }, [classKey])

  const meta = splitClass(classKey)
  const ready = !!(draft.date1.trim() && draft.topic1.trim())

  async function save() {
    if (!ready) return
    setSaving(true)
    const base = session ?? fresh(classKey)
    const next = await putSession({
      ...base,
      date1: draft.date1.trim(),
      topic1: draft.topic1.trim(),
      date2: draft.date2.trim(),
      topic2: draft.topic2.trim(),
    })
    setSession(next)
    setEditing(false)
    setSaving(false)
  }

  function openMark() {
    nav(`/checklist?class=${classKey}`)
  }

  return (
    <div className="shell-page">
      <div className="row-top">
        <Link className="back" to="/">
          ← Classes
        </Link>
        <span className="eyebrow">
          {meta.grade} · {meta.kind.includes('Homework') ? 'Homework' : 'Classwork'}
        </span>
      </div>
      <h2 className="page-title">Session</h2>
      <p className="sub">Up to two dates — like your Current pair</p>

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

      <div className="date-pair">
        <div className="date-card">
          <span className="lbl">DATE 1</span>
          {editing ? (
            <input
              value={draft.date1}
              onChange={(e) => setDraft((d) => ({ ...d, date1: e.target.value }))}
              placeholder="14/10"
            />
          ) : (
            <div className="big">{session?.date1 || '—'}</div>
          )}
          <div className="topic-pill">
            {editing ? (
              <input
                value={draft.topic1}
                onChange={(e) => setDraft((d) => ({ ...d, topic1: e.target.value }))}
                placeholder="Topic"
              />
            ) : (
              session?.topic1 || '—'
            )}
          </div>
        </div>
        <div className="date-card">
          <span className="lbl">DATE 2</span>
          {editing ? (
            <input
              value={draft.date2}
              onChange={(e) => setDraft((d) => ({ ...d, date2: e.target.value }))}
              placeholder="26/10"
            />
          ) : (
            <div className="big">{session?.date2 || '—'}</div>
          )}
          <div className="topic-pill">
            {editing ? (
              <input
                value={draft.topic2}
                onChange={(e) => setDraft((d) => ({ ...d, topic2: e.target.value }))}
                placeholder="Topic"
              />
            ) : (
              session?.topic2 || '—'
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <button type="button" className="btn-primary" disabled={!ready || saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save session'}
        </button>
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          + Add / change dates
        </button>
      )}

      <button type="button" className="btn-primary" disabled={!session?.date1} onClick={openMark}>
        Open Mark
      </button>
    </div>
  )
}
