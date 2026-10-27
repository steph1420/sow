import { useEffect, useState } from 'react'
import { CLASS_KEYS, CLASS_LABELS, listStudents, listRosterMeta, type ClassKey } from '../db'

export default function HomePage() {
  const [counts, setCounts] = useState<{ key: ClassKey; n: number; left: number }[]>([])

  useEffect(() => {
    ;(async () => {
      const rows = []
      for (const key of CLASS_KEYS) {
        const students = await listStudents(key)
        const meta = await listRosterMeta(key)
        rows.push({
          key,
          n: students.length,
          left: meta.filter((m) => m.left).length,
        })
      }
      setCounts(rows)
    })()
  }, [])

  return (
    <div className="stub">
      <h2>Home</h2>
      <p>Local store seeded (JB-2). Screens fill in JB-3/4.</p>
      <ul style={{ marginTop: 16, paddingLeft: 18, color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>
        {counts.map((c) => (
          <li key={c.key}>
            <b>{CLASS_LABELS[c.key]}</b> — {c.n} students ({c.left} Left)
          </li>
        ))}
      </ul>
    </div>
  )
}
