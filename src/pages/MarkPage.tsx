import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLASS_KEYS,
  CLASS_LABELS,
  getSettings,
  listMarks,
  listSessions,
  rosterWithLeft,
  setAllMarks,
  toggleMarkField,
  type ClassKey,
  type Mark,
  type Session,
} from '../db'
import '../styles/mark.css'

type Mode = 'set' | 'submitted'
type SetFilter = 'all' | 'finished' | 'pending'
type SubFilter = 'all' | 'submitted' | 'not'

export default function MarkPage() {
  const [classKey, setClassKey] = useState<ClassKey>('KGA_Eng_CW')
  const [session, setSession] = useState<Session | null>(null)
  const [roster, setRoster] = useState<(Awaited<ReturnType<typeof rosterWithLeft>>)>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [hideLeft, setHideLeft] = useState(false)
  const [mode, setMode] = useState<Mode>('set')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [setFilter, setSetFilter] = useState<SetFilter>('all')
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [letter, setLetter] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const reload = useCallback(async () => {
    const [sessions, ros, settings] = await Promise.all([
      listSessions(classKey),
      rosterWithLeft(classKey),
      getSettings(),
    ])
    const sess = sessions[0] ?? null
    setSession(sess)
    setRoster(ros)
    setHideLeft(!!settings.hideLeft)
    if (sess) {
      const all = await listMarks(classKey)
      setMarks(all)
    } else {
      setMarks([])
    }
  }, [classKey])

  useEffect(() => {
    void reload()
  }, [reload])

  const dates = useMemo(() => {
    if (!session) return [] as { date: string; topic: string }[]
    const out = [{ date: session.date1, topic: session.topic1 }]
    if (session.date2) out.push({ date: session.date2, topic: session.topic2 })
    return out
  }, [session])

  const markMap = useMemo(() => {
    const m = new Map<string, Mark>()
    for (const row of marks) m.set(`${row.roll}|${row.date}`, row)
    return m
  }, [marks])

  const activeRoster = useMemo(() => roster.filter((s) => !s.left), [roster])

  const status = useMemo(() => {
    let setCount = 0
    let subCount = 0
    let pending = 0
    const dateList = dates.map((d) => d.date)
    for (const s of activeRoster) {
      for (const d of dateList) {
        const m = markMap.get(`${s.roll}|${d}`)
        if (m?.set) setCount++
        else pending++
        if (m?.submitted) subCount++
      }
    }
    return { setCount, pending, subCount, active: activeRoster.length }
  }, [activeRoster, dates, markMap])

  const visibleDates = dateFilter ? dates.filter((d) => d.date === dateFilter) : dates
  const oneCol = visibleDates.length === 1

  const rows = useMemo(() => {
    let list = hideLeft ? roster.filter((s) => !s.left) : roster.slice()
    const qq = q.trim().toLowerCase()
    if (qq) list = list.filter((s) => s.name.toLowerCase().includes(qq) || String(s.roll).includes(qq))
    if (letter) list = list.filter((s) => s.name.toUpperCase().startsWith(letter))

    const dateForFilter = dateFilter ?? dates[0]?.date
    list = list.filter((s) => {
      if (s.left) return setFilter === 'all' && subFilter === 'all' // still show muted unless filtered? unfiltered shows left
      // apply set filters against chosen date or any?
      const checkDates = dateFilter ? [dateFilter] : dates.map((d) => d.date)
      const matchSet = (d: string) => {
        const m = markMap.get(`${s.roll}|${d}`)
        if (setFilter === 'finished') return !!m?.set
        if (setFilter === 'pending') return !m?.set
        return true
      }
      const matchSub = (d: string) => {
        const m = markMap.get(`${s.roll}|${d}`)
        if (subFilter === 'submitted') return !!m?.submitted
        if (subFilter === 'not') return !m?.submitted
        return true
      }
      // Left kids: only when no status filters (or always show in unfiltered)
      if (s.left) {
        if (setFilter !== 'all' || subFilter !== 'all') return false
        return true
      }
      // must match on the filter date if set, else any/all dates for that filter type
      if (setFilter !== 'all' || subFilter !== 'all') {
        return checkDates.some((d) => matchSet(d) && matchSub(d))
      }
      return true
    })

    // when pending filter + date, only pending on that date
    if (setFilter === 'pending' && dateForFilter) {
      list = list.filter((s) => {
        if (s.left) return false
        return !markMap.get(`${s.roll}|${dateForFilter}`)?.set
      })
    }
    if (setFilter === 'finished' && dateForFilter) {
      list = list.filter((s) => {
        if (s.left) return false
        return !!markMap.get(`${s.roll}|${dateForFilter}`)?.set
      })
    }
    if (subFilter === 'submitted' && dateForFilter) {
      list = list.filter((s) => !s.left && !!markMap.get(`${s.roll}|${dateForFilter}`)?.submitted)
    }
    if (subFilter === 'not' && dateForFilter) {
      list = list.filter((s) => !s.left && !markMap.get(`${s.roll}|${dateForFilter}`)?.submitted)
    }

    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [roster, hideLeft, q, letter, setFilter, subFilter, dateFilter, dates, markMap])

  const letters = useMemo(() => {
    const set = new Set(rows.filter((s) => !s.left).map((s) => s.name[0]?.toUpperCase()).filter(Boolean))
    return [...set].sort()
  }, [rows])

  async function onTap(roll: number, name: string, date: string, topic: string, left: boolean) {
    if (left) return
    await toggleMarkField(classKey, roll, date, mode, name, topic)
    await reload()
  }

  async function onCheckAll(date: string, topic: string) {
    const visible = rows.filter((s) => !s.left)
    // if all already on for mode → uncheck; else check
    const allOn = visible.every((s) => {
      const m = markMap.get(`${s.roll}|${date}`)
      return mode === 'set' ? !!m?.set : !!m?.submitted
    })
    await setAllMarks(classKey, date, topic, mode, !allOn, rows)
    await reload()
  }

  function toggleChipSet(next: SetFilter) {
    setSetFilter((cur) => (cur === next ? 'all' : next))
    if (next !== 'all') setSubFilter('all')
  }
  function toggleChipSub(next: SubFilter) {
    setSubFilter((cur) => (cur === next ? 'all' : next))
    if (next !== 'all') setSetFilter('all')
  }
  function toggleDate(d: string) {
    setDateFilter((cur) => (cur === d ? null : d))
  }

  const summaryPills: { cls: string; text: string }[] = [
    { cls: mode === 'set' ? 'set' : 'sub', text: mode === 'set' ? 'Set' : 'Submitted' },
  ]
  if (setFilter === 'pending') summaryPills.push({ cls: 'filt', text: 'Pending' })
  if (setFilter === 'finished') summaryPills.push({ cls: 'filt', text: 'Finished' })
  if (subFilter === 'submitted') summaryPills.push({ cls: 'filt', text: 'Submitted' })
  if (subFilter === 'not') summaryPills.push({ cls: 'filt', text: 'Not submitted' })
  if (dateFilter) summaryPills.push({ cls: 'filt', text: dateFilter })

  if (!session) {
    return (
      <div className="mark">
        <div className="class-pick">
          Class
          <select value={classKey} onChange={(e) => setClassKey(e.target.value as ClassKey)}>
            {CLASS_KEYS.map((k) => (
              <option key={k} value={k}>
                {CLASS_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="empty">No session for this class yet — create one in Session (JB-4).</div>
      </div>
    )
  }

  return (
    <div className="mark">
      <div className="class-pick">
        Class
        <select value={classKey} onChange={(e) => setClassKey(e.target.value as ClassKey)}>
          {CLASS_KEYS.map((k) => (
            <option key={k} value={k}>
              {CLASS_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="dates">
        {dates.map((d) => (
          <div
            key={d.date}
            className={`date-box${dateFilter === d.date ? ' on' : ''}${dateFilter && dateFilter !== d.date ? ' dim' : ''}`}
          >
            <label>{dateFilter === d.date ? 'Filtered' : 'Date'}</label>
            <div className="d">{d.date}</div>
            <div className="t">{d.topic || '—'}</div>
          </div>
        ))}
      </div>

      <div className="status-strip">
        <span className="ok">
          <b>{status.setCount}</b> set
        </span>
        <span className="pend">
          <b>{status.pending}</b> pending
        </span>
        <span className="subm">
          <b>{status.subCount}</b> submitted
        </span>
        <span>
          <b>{status.active}</b> active
        </span>
      </div>

      <div className={`tools${toolsOpen ? ' open' : ''}`}>
        <button type="button" className="tools-toggle" onClick={() => setToolsOpen((o) => !o)}>
          <div className="sum">
            {summaryPills.map((p, i) => (
              <span key={i} className={`pill ${p.cls}`}>
                {p.text}
              </span>
            ))}
          </div>
          <span className="chev">{toolsOpen ? 'Hide ▴' : 'Tools ▾'}</span>
        </button>
        <div className="tools-body">
          <div className="mode">
            <button type="button" className={mode === 'set' ? 'on-set' : ''} onClick={() => setMode('set')}>
              Set
            </button>
            <button type="button" className={mode === 'submitted' ? 'on-sub' : ''} onClick={() => setMode('submitted')}>
              Submitted
            </button>
          </div>
          <div className="mode-hint">
            Taps write <b style={{ color: mode === 'set' ? 'var(--ok)' : '#e0b0ff' }}>{mode === 'set' ? 'Set' : 'Submitted'}</b>
          </div>
          <div className="filters">
            <button type="button" className={`chip${setFilter === 'finished' ? ' on' : ''}`} onClick={() => toggleChipSet('finished')}>
              Finished
            </button>
            <button type="button" className={`chip${setFilter === 'pending' ? ' on' : ''}`} onClick={() => toggleChipSet('pending')}>
              Pending
            </button>
            {dates.map((d) => (
              <button
                key={d.date}
                type="button"
                className={`chip${dateFilter === d.date ? ' on' : ''}`}
                onClick={() => toggleDate(d.date)}
              >
                {d.date}
              </button>
            ))}
            <button type="button" className={`chip${subFilter === 'submitted' ? ' on' : ''}`} onClick={() => toggleChipSub('submitted')}>
              Submitted
            </button>
            <button type="button" className={`chip${subFilter === 'not' ? ' on' : ''}`} onClick={() => toggleChipSub('not')}>
              Not submitted
            </button>
          </div>
        </div>
      </div>

      <div className="search">
        <span>⌕</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
      </div>

      <div className={`head${oneCol ? ' one-col' : ''}`}>
        <span />
        <span className="n">Name</span>
        {visibleDates.map((d) => {
          const visibleActive = rows.filter((s) => !s.left)
          const allOn =
            visibleActive.length > 0 &&
            visibleActive.every((s) => {
              const m = markMap.get(`${s.roll}|${d.date}`)
              return mode === 'set' ? !!m?.set : !!m?.submitted
            })
          return (
            <span key={d.date} className="col-h">
              <span className="dh">{d.date}</span>
              <button
                type="button"
                className={`all${allOn ? (mode === 'set' ? ' set' : ' sub') : ''}`}
                title="Check/uncheck all visible"
                onClick={() => void onCheckAll(d.date, d.topic)}
              >
                ✓
              </button>
            </span>
          )
        })}
      </div>

      <div className="list">
        {rows.length === 0 && <div className="empty">No students match these filters.</div>}
        {rows.map((s) => (
          <div key={s.id} className={`row${oneCol ? ' one-col' : ''}${s.left ? ' left' : ''}`}>
            <span className="roll">{s.roll}</span>
            <span className="name">
              {s.name}
              {s.left ? <span className="badge">Left</span> : null}
            </span>
            {visibleDates.map((d) => {
              const m = markMap.get(`${s.roll}|${d.date}`)
              const on = mode === 'set' ? !!m?.set : !!m?.submitted
              // show stored ticks: green for set when mode set, purple for submitted when mode submitted
              // also show the "other" lightly? mock shows current mode field
              const cls =
                mode === 'set'
                  ? on
                    ? 'check set-on'
                    : 'check'
                  : on
                    ? 'check sub-on'
                    : 'check'
              return (
                <button
                  key={d.date}
                  type="button"
                  className={cls}
                  disabled={s.left}
                  onClick={() => void onTap(s.roll, s.name, d.date, d.topic, s.left)}
                >
                  ✓
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {letters.length > 0 && (
        <div className="az" aria-hidden>
          {letters.map((L) => (
            <span
              key={L}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => setLetter((cur) => (cur === L ? null : L))}
            >
              {L}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
