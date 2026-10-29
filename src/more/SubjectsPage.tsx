import { useEffect, useState } from 'react'
import { type DiscoveredTab, type SubjectId } from '../data/types'
import { getSettings } from '../data'
import { MoreChrome } from './MoreChrome'
import './more.css'

type Props = { onBack: () => void }


/**
 * Subjects & sheets — catalog = tabs actually discovered on the workbook (v0.26).
 * Known app keys with no real tab are shown as “not on sheet” — never claimed live.
 */
export function SubjectsPage({ onBack }: Props) {
  const [tabs, setTabs] = useState<DiscoveredTab[]>([])
  const [at, setAt] = useState<string | undefined>()

  useEffect(() => {
    void getSettings().then((s) => {
      setTabs(s.discoveredTabs ?? [])
      setAt(s.discoveredAt)
    })
  }, [])

  const SUBJECTS = [...new Set(tabs.map((t) => t.subject))] as SubjectId[]

  return (
    <MoreChrome title="Subjects & sheets" onBack={onBack}>
      <div className="more-hint">
        Tabs read from the Sheet{at ? ` · checked ${new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : ' · open Sync to discover'}.
        Sync’s chips pick from these each run.
      </div>

      <div className="more-sec">Subjects</div>
      <div className="more-card">
        {!SUBJECTS.length ? (
          <div className="more-row" style={{ cursor: 'default' }}>
            Sync to load your classes
          </div>
        ) : null}
        {SUBJECTS.map((s) => {
          const n = tabs.filter((t) => t.subject === s).length
          return (
            <div key={s} className="more-row" style={{ cursor: 'default' }}>
              {s}
              <span className="meta">{n ? `${n} tab${n > 1 ? 's' : ''} · on sheet` : 'Not on sheet yet'}</span>
            </div>
          )
        })}
      </div>

      <div className="more-sec">Tabs on sheet</div>
      <div className="more-card">
        {tabs.length ? (
          tabs.map((t) => (
            <div key={t.name} className="more-row" style={{ cursor: 'default' }}>
              {t.name}
              <span className="meta">{t.subject}</span>
            </div>
          ))
        ) : (
          <div className="more-row" style={{ cursor: 'default' }}>
            None discovered yet
          </div>
        )}
      </div>

    </MoreChrome>
  )
}
