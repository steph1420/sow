import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getSettings,
  listMarks,
  listSessions,
  rosterWithLeft,
  type ClassKey,
  type Mark,
  type Session,
} from '../../../db'
import { parseClassParam } from '../../../lib/classMeta'
import type { ColPills, DateInfo, DateSlot } from '../types'

export function useChecklistSession() {
  const [params, setParams] = useSearchParams()
  const [classKey, setClassKey] = useState<ClassKey>(
    () => parseClassParam(params.get('class')) ?? 'KGA_Eng_CW',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof rosterWithLeft>>>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [hideLeft, setHideLeft] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [colPills, setColPills] = useState<ColPills>({ d1: true, d2: true })

  useEffect(() => {
    const fromUrl = parseClassParam(params.get('class'))
    if (fromUrl && fromUrl !== classKey) setClassKey(fromUrl)
  }, [params, classKey])

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
      setActiveDate((cur) => {
        const dates = [sess.date1, sess.date2].filter(Boolean)
        if (cur && dates.includes(cur)) return cur
        return dates[0] ?? null
      })
      if (!sess.date2) setColPills({ d1: true, d2: true })
    } else {
      setMarks([])
      setActiveDate(null)
      setColPills({ d1: true, d2: true })
    }
  }, [classKey])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectClass = useCallback(
    (k: ClassKey) => {
      setClassKey(k)
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('class', k)
        return next
      })
    },
    [setParams],
  )

  const dates: DateInfo[] = useMemo(() => {
    if (!session) return []
    const out: DateInfo[] = [{ date: session.date1, topic: session.topic1, slot: 'd1' }]
    if (session.date2) out.push({ date: session.date2, topic: session.topic2, slot: 'd2' })
    return out.filter((d) => d.date)
  }, [session])

  const markMap = useMemo(() => {
    const m = new Map<string, Mark>()
    for (const row of marks) m.set(`${row.roll}|${row.date}`, row)
    return m
  }, [marks])

  return {
    classKey,
    selectClass,
    session,
    roster,
    marks,
    markMap,
    hideLeft,
    activeDate,
    setActiveDate,
    colPills,
    setColPills,
    dates,
    reload,
  }
}

export type { DateSlot }
