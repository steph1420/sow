import { useMemo, useRef, useState } from 'react'
import { CLASS_LABELS } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { useBackLayer } from '../nav/backStack'
import { haptic } from '../lib/haptics'
import { copyText, openExternal } from './clipboard'
import type { ShareTarget } from './ShareContext'
import {
  buildShareLists,
  buildShareMessage,
  namesCountFor,
  pickInitial,
  previewLines,
  waMeUrl,
  WA_LONG_WARN,
} from './shareTemplates'
import { useShareState } from './useShareState'

const HOLD_MS = 500

type Props = {
  target: ShareTarget
  onClose: () => void
  onManage: (templateId?: string, create?: boolean) => void
  onToast: (msg: string) => void
}

export function CopyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="share-ico">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 5.5v-.5a2 2 0 0 0-2-2H6a2.5 2.5 0 0 0-2.5 2.5V13a2 2 0 0 0 2 2h.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Share chooser (mock share-mj3 / mj5): context → template pills → live preview → prefix → Copy + WhatsApp.
 * Long-press a pill = edit it in Settings → Sharing. Hardware Back closes the sheet first.
 */
export function ShareSheet({ target, onClose, onManage, onToast }: Props) {
  useBackLayer(1, onClose)
  const { marksByClass, rosterFor } = useWorkspace()
  const [share, setShare] = useShareState()
  const [selId, setSelId] = useState(() => pickInitial(share)?.id ?? '')
  const [prefix, setPrefix] = useState(share.includeClassPrefix)
  const tpl = share.templates.find((t) => t.id === selId) ?? share.templates[0]
  const hold = useRef<{ id: string; timer: number; x: number; y: number } | null>(null)

  const classLabel = CLASS_LABELS[target.classKey]
  const lists = useMemo(
    () => buildShareLists(rosterFor(target.classKey), marksByClass[target.classKey] ?? {}, target.date.date),
    [rosterFor, marksByClass, target],
  )
  const base = { classLabel, date: target.date.dayNum, topic: target.date.topic, lists, includeClassPrefix: prefix }
  const body = tpl?.body ?? ''
  const message = buildShareMessage({ ...base, body })
  const pv = previewLines(buildShareMessage({ ...base, body, emptyNames: '(none)' }))
  const count = namesCountFor(body, lists)
  const blank = !body.trim()
  const long = encodeURIComponent(message).length > WA_LONG_WARN

  const used = () => setShare((s) => ({ ...s, lastUsedId: tpl?.id ?? s.lastUsedId }))
  const onCopy = async () => {
    if (blank) return
    const ok = await copyText(message)
    used()
    onToast(ok ? 'Copied' : "Couldn't copy")
    if (ok) onClose()
  }
  const onWhatsApp = () => {
    if (blank) return
    used()
    onClose()
    openExternal(waMeUrl(message))
  }

  const clearHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer)
    hold.current = null
  }

  const ctx = [classLabel, target.date.dayNum, target.date.topic].filter(Boolean).join(' · ')

  return (
    <>
      <button type="button" className="share-scrim" aria-label="Dismiss Share" onClick={onClose} />
      <div className="share-sheet" role="dialog" aria-label="Share" data-message={message}>
        <div className="share-grab" aria-hidden />
        <div className="share-h">Share</div>
        <div className="share-ctx">{ctx}</div>

        <div className="share-pills" role="radiogroup" aria-label="Templates">
          {share.templates.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === tpl?.id}
              className={`share-pill${t.id === tpl?.id ? ' on' : ''}`}
              onClick={() => setSelId(t.id)}
              onPointerDown={(e) => {
                const id = t.id
                clearHold()
                hold.current = {
                  id,
                  x: e.clientX,
                  y: e.clientY,
                  timer: window.setTimeout(() => {
                    hold.current = null
                    haptic('hold')
                    onManage(id)
                  }, HOLD_MS),
                }
              }}
              onPointerMove={(e) => {
                const h = hold.current
                if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 10) clearHold()
              }}
              onPointerUp={clearHold}
              onPointerCancel={clearHold}
              onContextMenu={(e) => e.preventDefault()}
            >
              {t.name}
            </button>
          ))}
          <button type="button" className="share-pill add" onClick={() => onManage(undefined, true)}>
            ＋ New
          </button>
        </div>

        <div className="share-pvh">
          <span>Preview</span>
          {count != null ? <span className="share-count">{count} {count === 1 ? 'name' : 'names'}</span> : null}
        </div>
        <div className="share-pv">
          {pv.lines.join('\n')}
          {pv.more ? `\n…${pv.more} more` : ''}
        </div>
        {blank ? <div className="share-warn">This template is empty — edit it in Settings → Sharing.</div> : null}
        {long && !blank ? <div className="share-warn">Long message — WhatsApp may cut it. Copy is safer.</div> : null}

        <button
          type="button"
          className="share-prefix-row"
          onClick={() => setPrefix((v) => !v)}
        >
          <span>Include KGA/KGB prefix</span>
          <span
            className={`toggle share-prefix${prefix ? ' on' : ''}`}
            role="switch"
            aria-checked={prefix}
            aria-label="Include KGA/KGB prefix"
          />
        </button>

        <div className="share-targets">
          <button type="button" className="share-btn share-copy" disabled={blank} onClick={onCopy}>
            <CopyIcon /> Copy
          </button>
          <button type="button" className="share-btn share-wa" disabled={blank} onClick={onWhatsApp}>
            WhatsApp
          </button>
        </div>
        <div className="share-foot">
          Long-press a template to edit ·{' '}
          <button type="button" className="share-manage" onClick={() => onManage(tpl?.id)}>
            Manage in Settings → Sharing
          </button>
        </div>
      </div>
    </>
  )
}
