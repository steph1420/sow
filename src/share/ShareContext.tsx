import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DateSlot } from '../checklist/types'
import type { ClassKey } from '../data/types'
import { ShareSheet } from './ShareSheet'
import { Toast, type ToastAction } from '../components/Toast'
import './share.css'

/** `dates` (t170u): Checklist in two-date mode passes both → sheet shows a date toggle. */
export type ShareTarget = { classKey: ClassKey; date: DateSlot; dates?: DateSlot[] }

type ShareValue = {
  openShare: (t: ShareTarget) => void
  /** v0.41.0: optional action (Redo / Undo); every toast swipes / taps away. */
  toast: (msg: string, opts?: { action?: ToastAction; ms?: number }) => void
}

const Ctx = createContext<ShareValue | null>(null)

type Props = {
  children: ReactNode
  /** Settings → Sharing (optionally editing a template, or creating a new one). */
  onManage: (templateId?: string, create?: boolean) => void
}

/** v0.28 Share — one chooser sheet for the whole shell (Overview cards + Checklist Tools). */
export function ShareProvider({ children, onManage }: Props) {
  const [target, setTarget] = useState<ShareTarget | null>(null)
  const [toastMsg, setToastMsg] = useState<{ msg: string; action?: ToastAction; n: number } | null>(null)
  const timer = useRef<number | null>(null)

  const toast = useCallback((msg: string, opts?: { action?: ToastAction; ms?: number }) => {
    setToastMsg((p) => ({ msg, action: opts?.action, n: (p?.n ?? 0) + 1 }))
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastMsg(null), opts?.ms ?? (opts?.action ? 4000 : 1800))
  }, [])
  const dismiss = useCallback(() => { if (timer.current) window.clearTimeout(timer.current); setToastMsg(null) }, [])

  const openShare = useCallback((t: ShareTarget) => setTarget(t), [])
  const close = useCallback(() => setTarget(null), [])
  const manage = useCallback(
    (id?: string, create?: boolean) => {
      setTarget(null)
      onManage(id, create)
    },
    [onManage],
  )

  const value = useMemo(() => ({ openShare, toast }), [openShare, toast])
  return (
    <Ctx.Provider value={value}>
      {children}
      {target ? <ShareSheet target={target} onClose={close} onManage={manage} onToast={toast} /> : null}
      {toastMsg ? (
        <Toast key={toastMsg.n} onDismiss={dismiss} action={toastMsg.action}>
          {toastMsg.msg}
        </Toast>
      ) : null}
    </Ctx.Provider>
  )
}

export function useShare(): ShareValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useShare outside ShareProvider')
  return v
}
