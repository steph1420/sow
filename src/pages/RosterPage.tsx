import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CLASS_KEYS,
  rosterWithLeft,
  setLeft,
  type ClassKey,
} from '../db'
import { parseClassParam } from '../lib/classMeta'
import '../styles/shell.css'
import '../styles/roster.css'

type GradeFilter = 'all' | 'KGA' | 'KGB'

type Row = Awaited<ReturnType<typeof rosterWithLeft>>[number]

function gradeOf(key: ClassKey): 'KGA' | 'KGB' {
  return key.startsWith('KGB') ? 'KGB' : 'KGA'
}

/** CW tab is the roster source of truth per grade (HW mirrors Left via sync seeds). */
function cwKeyForGrade(g: 'KGA' | 'KGB'): ClassKey {
  return g === 'KGB' ? 'KGB_Eng_CW' : 'KGA_Eng_CW'
}

function gradeFromParam(raw: string | null): GradeFilter {
  const key = parseClassParam(raw)
  if (!key) return 'KGA'
  return gradeOf(key)
}

export default function RosterPage() {
  const [params, setParams] = useSearchParams()
  const [grade, setGrade] = useState<GradeFilter>(() => gradeFromParam(params.get('class')))
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')

  const reload = useCallback(async () => {
    const keys: ClassKey[] =
      grade === 'all' ? CLASS_KEYS.filter((k) => k.endsWith('_CW')) : [cwKeyForGrade(grade)]
    const lists = await Promise.all(keys.map((k) => rosterWithLeft(k)))
    const merged = lists.flat()
    // Dedupe All view by grade|roll (CW only already unique per grade)
    const seen = new Set<string>()
    const out: Row[] = []
    for (const s of merged) {
      const id = `${gradeOf(s.classKey)}|${s.roll}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push(s)
    }
    out.sort((a, b) => {
      if (grade === 'all') {
        const ga = gradeOf(a.classKey)
        const gb = gradeOf(b.classKey)
        if (ga !== gb) return ga.localeCompare(gb)
      }
      return a.roll - b.roll
    })
    setRows(out)
  }, [grade])

  useEffect(() => {
    void reload()
  }, [reload])


  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        String(s.roll).includes(needle),
    )
  }, [rows, q])

  async function toggle(s: Row) {
    await setLeft(s.classKey, s.roll, !s.left, s.name)
    // Mirror Left onto sibling HW/CW so Checklist hide-left stays in sync
    const sibling = (CLASS_KEYS.find(
      (k) => k !== s.classKey && gradeOf(k) === gradeOf(s.classKey),
    ) ?? null) as ClassKey | null
    if (sibling) {
      await setLeft(sibling, s.roll, !s.left, s.name)
    }
    await reload()
  }

  function pickGrade(g: GradeFilter) {
    setGrade(g)
    setQ('')
    const next = g === 'all' ? cwKeyForGrade('KGA') : cwKeyForGrade(g)
    setParams({ class: next }, { replace: true })
  }

  return (
    <div className="shell-page ros-page">
      <div className="ros-top">
        <Link className="back" to="/overview">
          ← More
        </Link>
        <h2 className="page-title ros-title">Roster</h2>
        <span className="ros-top-spacer" aria-hidden />
      </div>

      <div className="ros-chips" role="toolbar" aria-label="Class">
        {(['KGA', 'KGB', 'all'] as GradeFilter[]).map((g) => (
          <button
            key={g}
            type="button"
            className={`ros-chip${grade === g ? ' on' : ''}`}
            onClick={() => pickGrade(g)}
          >
            {g === 'all' ? 'All' : g}
          </button>
        ))}
      </div>

      <label className="ros-search">
        <span className="ros-search-ico" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or roll"
          enterKeyHint="search"
          autoComplete="off"
        />
        {q ? (
          <button
            type="button"
            className="ros-search-clear"
            aria-label="Clear search"
            onClick={() => setQ('')}
          >
            ×
          </button>
        ) : null}
      </label>

      <div className="ros-list">
        {visible.map((s) => (
          <div key={s.id} className={`ros-row${s.left ? ' left' : ''}`}>
            <span className="ros-roll">{s.roll}</span>
            <span className="ros-name">
              {s.name}
              {grade === 'all' ? (
                <span className="ros-grade-tag">{gradeOf(s.classKey)}</span>
              ) : null}
              {s.left ? <span className="ros-badge">Left</span> : null}
            </span>
            <button
              type="button"
              className={`ros-tog${s.left ? ' on' : ''}`}
              onClick={() => void toggle(s)}
              title="Toggle Left"
              aria-pressed={s.left}
            >
              {s.left ? 'Left' : 'Active'}
            </button>
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="empty-soft">
            {rows.length === 0 ? 'No students yet — Sync to pull roster.' : 'No matches.'}
          </div>
        ) : null}
      </div>
    </div>
  )
}
