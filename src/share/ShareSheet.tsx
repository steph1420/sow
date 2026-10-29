import { useMemo, useRef, useState } from 'react'
import type React from 'react'
import { CLASS_LABELS } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import { shouldDismissSheet, sheetOffset } from './sheetDrag'
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
  const prefix = share.includeClassPrefix // t170u: set only in Settings → Sharing
  // t170u: two-date Checklist → pick which date the message is for (defaults to the first/focused one)
  const dateOpts = target.dates && target.dates.length > 1 ? target.dates : [target.date]
  const [dateIdx, setDateIdx] = useState(() => Math.max(0, dateOpts.findIndex((d) => d.date === target.date.date)))
  const date = dateOpts[dateIdx] ?? target.date
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; y0: number; t0: number; lastY: number; lastT: number; moved: boolean } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [settling, setSettling] = useState(false)
  const onGrabDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const now = performance.now()
    drag.current = { id: e.pointerId, y0: e.clientY, t0: now, lastY: e.clientY, lastT: now, moved: false }
    setSettling(false)
  }
  const onGrabMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.y0
    if (Math.abs(dy) > 6) d.moved = true
    d.lastY = e.clientY
    d.lastT = performance.now()
    setDragY(sheetOffset(dy))
  }
  const onGrabUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId) return
    if (!d.moved) return onClose() // tap the handle = close
    const dy = e.clientY - d.y0
    const v = (e.clientY - d.y0) / Math.max(1, performance.now() - d.t0)
    const h = sheetRef.current?.offsetHeight ?? 600
    setSettling(true)
    if (shouldDismissSheet(dy, h, v)) {
      setDragY(h)
      window.setTimeout(onClose, 160)
    } else setDragY(0)
  }
  const tpl = share.templates.find((t) => t.id === selId) ?? share.templates[0]
  const hold = useRef<{ id: string; timer: number; x: number; y: number } | null>(null)

  const classLabel = CLASS_LABELS[target.classKey]
  const lists = useMemo(
    () => buildShareLists(rosterFor(target.classKey), marksByClass[target.classKey] ?? {}, date.date),
    [rosterFor, marksByClass, target.classKey, date.date],
  )
  const base = { classLabel, date: date.dayNum, topic: date.topic, lists, includeClassPrefix: prefix }
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
    if (ok) haptic('light')
    if (ok) onClose()
  }
  const onWhatsApp = () => {
    if (blank) return
    used()
    haptic('light')
    onClose()
    openExternal(waMeUrl(message))
  }

  const clearHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer)
    hold.current = null
  }

  const ctx = [classLabel, date.dayNum, date.topic].filter(Boolean).join(' · ')

  return (
    <>
      <button type="button" className="share-scrim" aria-label="Dismiss Share" onClick={onClose} />
      <div
        ref={sheetRef}
        className={`share-sheet${settling ? ' settling' : ''}${dragY ? ' dragging' : ''}`}
        role="dialog"
        aria-label="Share"
        data-message={message}
        data-date={date.date}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <button
          type="button"
          className="share-grab-hit"
          aria-label="Close Share (tap or drag down)"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={() => { drag.current = null; setSettling(true); setDragY(0) }}
        >
          <span className="share-grab" aria-hidden />
        </button>
        <div className="share-head">
          <div className="share-head-txt">
            <div className="share-h">Share</div>
            <div className="share-ctx">{ctx}</div>
          </div>
          <button type="button" className="share-x" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {dateOpts.length > 1 ? (
          <div className="share-dates" role="radiogroup" aria-label="Share for date">
            {dateOpts.map((d, i) => (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={i === dateIdx}
                className={`share-date${i === dateIdx ? ' on' : ''}`}
                onClick={() => setDateIdx(i)}
              >
                {d.dayNum}
              </button>
            ))}
          </div>
        ) : null}

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
                    haptic('light')
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

        <div className="share-targets">
          <button type="button" className="share-btn share-copy" disabled={blank} onClick={onCopy}>
            <CopyIcon /> Copy
          </button>
          <button type="button" className="share-btn share-wa" disabled={blank} onClick={onWhatsApp}>
            WhatsApp
          </button>
        </div>
      </div>
    </>
  )
}
