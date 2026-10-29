import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { CLASS_LABELS } from '../data/types'
import { useWorkspace } from '../demo/WorkspaceContext'
import {
  COUNT_CHIPS,
  NAME_CHIPS,
  NAME_MAX,
  SEED_TEMPLATES,
  addTemplate,
  buildShareLists,
  buildShareMessage,
  deleteTemplate,
  duplicateTemplate,
  isSubmittedToken,
  KNOWN_TOKENS,
  moveTemplate,
  renameTemplate,
  restoreDefaults,
  setTemplateBody,
  unknownTokens,
  type ShareLists,
} from '../share/shareTemplates'
import { useShareState } from '../share/useShareState'
import { haptic } from '../lib/haptics'
import { MoreChrome } from './MoreChrome'
import '../share/share.css'
import './more.css'

type Props = {
  onBack: () => void
  /** Template to open for editing (long-press in the chooser). */
  initialId?: string
  /** Chooser “＋ New” → create one on arrival. */
  createOnOpen?: boolean
  onConsumedIntent?: () => void
}

/** Fallback preview when nothing is loaded (v0.21 WA_PREVIEW_SAMPLE). */
const SAMPLE: { classLabel: string; date: string; topic: string; lists: ShareLists } = {
  classLabel: 'KGA Eng CW',
  date: '28/10',
  topic: 'Reading',
  lists: {
    notSet: ['Sahil', 'Shaurya', 'Siya'],
    set: ['Aarav', 'Diya'],
    notSubmitted: ['Sahil', 'Shaurya', 'Siya', 'Aarav'],
    submitted: ['Diya'],
    active: ['Sahil', 'Shaurya', 'Siya', 'Aarav', 'Diya'],
    left: ['Old Kid'],
  },
}

/** Highlighted backdrop for the editor (mock mj4): known tokens green, unknown underlined amber. */
function Highlight({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(/\{[^{}\s]+\}/g)) {
    const at = m.index ?? 0
    if (at > last) parts.push(text.slice(last, at))
    const known = KNOWN_TOKENS.includes(m[0])
    parts.push(
      <span key={i++} className={`shr-tok${known ? '' : ' bad'}`}>
        {m[0]}
      </span>,
    )
    last = at + m[0].length
  }
  parts.push(text.slice(last))
  // trailing newline needs a glyph so the backdrop height matches the textarea
  parts.push('\u200b')
  return <>{parts}</>
}

/** Settings → Sharing (mock share-mj4): drag list · default · rename/duplicate/delete · token editor · live preview. */
export function SharingPage({ onBack, initialId, createOnOpen, onConsumedIntent }: Props) {
  const [share, setShare] = useShareState()
  const { sessions, marksByClass, rosterFor } = useWorkspace()
  const [editId, setEditId] = useState<string>(
    () => share.templates.find((t) => t.id === initialId)?.id ?? share.templates.find((t) => t.id === share.defaultId)?.id ?? share.templates[0]!.id,
  )
  const tpl = share.templates.find((t) => t.id === editId) ?? share.templates[0]!
  const [draft, setDraft] = useState(tpl.body)
  const [nameDraft, setNameDraft] = useState(tpl.name)
  const [armDelete, setArmDelete] = useState(false)
  const [showCounts, setShowCounts] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const sel = useRef<[number, number] | null>(null)

  // Arrival intents from the chooser
  useEffect(() => {
    if (createOnOpen) {
      const n = addTemplate(share)
      setShare(() => n)
      setEditId(n.templates[n.templates.length - 1]!.id)
    }
    if (createOnOpen || initialId) onConsumedIntent?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-seed drafts when the edited template changes
  useEffect(() => {
    setDraft(tpl.body)
    setNameDraft(tpl.name)
    setArmDelete(false)
    sel.current = null
  }, [tpl.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    const s = sessions[0]
    if (!s) return { ...SAMPLE, label: `${SAMPLE.classLabel} ${SAMPLE.date}` }
    const lists = buildShareLists(rosterFor(s.classKey), marksByClass[s.classKey] ?? {}, s.date.date)
    const classLabel = CLASS_LABELS[s.classKey]
    return { classLabel, date: s.date.dayNum, topic: s.date.topic, lists, label: `${classLabel} ${s.date.dayNum}` }
  }, [sessions, rosterFor, marksByClass])
  const previewText = buildShareMessage({
    ...preview,
    body: draft,
    includeClassPrefix: share.includeClassPrefix,
    emptyNames: '(none)',
  })
  const bad = unknownTokens(draft)

  const commitBody = (v: string) => {
    setDraft(v)
    if (v.trim()) setShare((s) => setTemplateBody(s, tpl.id, v))
  }
  const commitName = () => {
    if (!nameDraft.trim()) {
      setNameDraft(tpl.name)
      return
    }
    setShare((s) => renameTemplate(s, tpl.id, nameDraft))
  }
  // keep the input in sync after uniqueness suffixing
  useEffect(() => {
    if (document.activeElement !== nameRef.current) setNameDraft(tpl.name)
  }, [tpl.name])

  const insertToken = (tok: string) => {
    const ta = bodyRef.current
    const [a, b] = sel.current ?? [draft.length, draft.length]
    const next = draft.slice(0, a) + tok + draft.slice(b)
    commitBody(next)
    const caret = a + tok.length
    sel.current = [caret, caret]
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(caret, caret)
    })
  }
  const rememberSel = () => {
    const ta = bodyRef.current
    if (ta) sel.current = [ta.selectionStart, ta.selectionEnd]
  }

  // ── drag to reorder (handle, real touch) ──
  const listRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; from: number; to: number; mids: number[]; pointerId: number } | null>(null)
  const [dragView, setDragView] = useState<{ id: string; to: number } | null>(null)
  const order = useMemo(() => {
    if (!dragView) return share.templates
    const from = share.templates.findIndex((t) => t.id === dragView.id)
    return moveTemplate(share, from, dragView.to).templates
  }, [share, dragView])

  const onHandleDown = (e: RPE, id: string, index: number) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('.shr-row') ?? [])]
    drag.current = { id, from: index, to: index, pointerId: e.pointerId, mids: rows.map((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 }) }
    setDragView({ id, to: index })
    haptic('light')
  }
  const onHandleMove = (e: RPE) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const others = d.mids.filter((_, i) => i !== d.from)
    const to = others.filter((m) => m < e.clientY).length
    d.to = to
    setDragView((v) => (v && v.to === to ? v : { id: d.id, to }))
  }
  const onHandleUp = (e: RPE) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    setDragView(null)
    if (d.to !== d.from) setShare((s) => moveTemplate(s, s.templates.findIndex((t) => t.id === d.id), d.to))
  }

  const missingBuiltins = SEED_TEMPLATES.some((b) => !share.templates.some((t) => t.id === b.id))
  const isDefault = tpl.id === share.defaultId
  const onlyOne = share.templates.length <= 1

  const newTemplate = () => {
    const n = addTemplate(share)
    setShare(() => n)
    setEditId(n.templates[n.templates.length - 1]!.id)
    requestAnimationFrame(() => {
      nameRef.current?.focus()
      nameRef.current?.select()
    })
  }

  return (
    <MoreChrome
      title="Sharing"
      onBack={onBack}
      action={
        <button type="button" className="shr-new" onClick={newTemplate}>
          ＋ New
        </button>
      }
    >
      <div className="more-sec">Templates · drag to reorder</div>
      <div className="more-card shr-list" ref={listRef}>
        {order.map((t, i) => {
          const editing = t.id === tpl.id
          const def = t.id === share.defaultId
          return (
            <div
              key={t.id}
              data-id={t.id}
              className={`shr-row${editing ? ' editing' : ''}${def ? ' default' : ''}${dragView?.id === t.id ? ' dragging' : ''}`}
              onClick={() => setEditId(t.id)}
            >
              <span
                className="shr-handle"
                aria-label={`Drag ${t.name}`}
                onPointerDown={(e) => onHandleDown(e, t.id, i)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onClick={(e) => e.stopPropagation()}
              >
                ⋮⋮
              </span>
              <span className="shr-title">{t.name}</span>
              {def ? <span className="shr-badge">Default</span> : editing ? <span className="shr-meta">Editing</span> : null}
            </div>
          )
        })}
      </div>

      <div className="more-sec">Edit “{tpl.name}”</div>
      <div className="more-card shr-edit">
        <div className="shr-edit-head">
          <input
            ref={nameRef}
            className="shr-name"
            value={nameDraft}
            maxLength={NAME_MAX}
            aria-label="Template name"
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
          <span className="shr-acts">
            <button
              type="button"
              className="shr-rename"
              onClick={() => {
                nameRef.current?.focus()
                nameRef.current?.select()
              }}
            >
              Rename
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="shr-dup"
              onClick={() => {
                const n = duplicateTemplate(share, tpl.id)
                setShare(() => n)
                setEditId(n.templates[n.templates.findIndex((t) => t.id === tpl.id) + 1]!.id)
              }}
            >
              Duplicate
            </button>
            {!isDefault ? (
              <>
                <span aria-hidden>·</span>
                <button type="button" className="shr-default" onClick={() => setShare((s) => ({ ...s, defaultId: tpl.id }))}>
                  Default
                </button>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <button
              type="button"
              className={`shr-del${armDelete ? ' armed' : ''}`}
              disabled={onlyOne}
              onClick={() => {
                if (!armDelete) {
                  setArmDelete(true)
                  window.setTimeout(() => setArmDelete(false), 3000)
                  return
                }
                const idx = share.templates.findIndex((t) => t.id === tpl.id)
                const next = deleteTemplate(share, tpl.id)
                setShare(() => next)
                setEditId(next.templates[Math.max(0, idx - 1)]!.id)
              }}
            >
              {armDelete ? 'Delete?' : 'Delete'}
            </button>
          </span>
        </div>

        <div className="shr-editor">
          <div className="shr-backdrop" ref={backdropRef} aria-hidden>
            <Highlight text={draft} />
          </div>
          <textarea
            ref={bodyRef}
            className="shr-body"
            value={draft}
            spellCheck={false}
            aria-label="Template text"
            onChange={(e) => {
              commitBody(e.target.value)
              rememberSel()
            }}
            onSelect={rememberSel}
            onKeyUp={rememberSel}
            onBlur={rememberSel}
            onScroll={(e) => {
              if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop
            }}
          />
        </div>
        {!draft.trim() ? <div className="shr-warn">A template can't be empty — your last text is kept.</div> : null}
        {bad.length ? (
          <div className="shr-warn">
            Unknown {bad.length === 1 ? 'token' : 'tokens'} {bad.join(' ')} — sent as typed.
          </div>
        ) : null}

        <div className="shr-chips">
          {NAME_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              data-token={c}
              className={`shr-chip${isSubmittedToken(c) ? ' sub' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertToken(c)}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            className={`shr-chip more${showCounts ? ' on' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowCounts((v) => !v)}
            aria-expanded={showCounts}
          >
            {'{count.*}'}
          </button>
          {showCounts
            ? COUNT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-token={c}
                  className={`shr-chip${isSubmittedToken(c) ? ' sub' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(c)}
                >
                  {c}
                </button>
              ))
            : null}
        </div>
      </div>

      <div className="more-sec">Preview · {preview.label}</div>
      <div className="more-card shr-pv-card">
        <div className="shr-pv">{previewText}</div>
      </div>

      <div className="more-card">
        <button
          type="button"
          className="more-row g-row-like shr-prefix-row"
          onClick={() => setShare((s) => ({ ...s, includeClassPrefix: !s.includeClassPrefix }))}
         role="switch" aria-checked={Boolean(share.includeClassPrefix)}>
          <span className="g-body">
            <span className="g-title">Include KGA/KGB prefix</span>
            <span className="g-sub">Default for Share · the sheet can flip it per message</span>
          </span>
          <span
            className={`toggle shr-prefix${share.includeClassPrefix ? ' on' : ''}`}
            role="switch"
            aria-checked={share.includeClassPrefix}
            aria-label="Include KGA/KGB prefix"
          />
        </button>
      </div>

      {missingBuiltins ? (
        <button type="button" className="shr-restore" onClick={() => setShare((s) => restoreDefaults(s))}>
          Restore default templates
        </button>
      ) : null}
    </MoreChrome>
  )
}
