import { useRef, useState, type ReactNode, type PointerEvent as RPE } from 'react'

/** v0.41.0 (t101u): every toast can be swiped away sideways (follows the finger) or dismissed with a tap.
 *  An optional action button (e.g. Redo / Undo) runs without dismissing by tap. */
export type ToastAction = { label: string; run: () => void }
type Props = { children: ReactNode; onDismiss: () => void; action?: ToastAction; className?: string }

export function Toast({ children, onDismiss, action, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const st = useRef<{ x0: number; t0: number; dx: number; id: number } | null>(null)
  const [gone, setGone] = useState<0 | 1 | -1>(0)
  const down = (e: RPE) => {
    if ((e.target as HTMLElement).closest('button')) return
    st.current = { x0: e.clientX, t0: performance.now(), dx: 0, id: e.pointerId }
    try { ref.current?.setPointerCapture(e.pointerId) } catch { /* synthetic */ }
  }
  const move = (e: RPE) => {
    const s = st.current; if (!s || !ref.current) return
    s.dx = e.clientX - s.x0
    ref.current.style.transition = 'none'
    ref.current.style.translate = `calc(-50% + ${s.dx}px) 0`
    ref.current.style.opacity = String(Math.max(0.15, 1 - Math.abs(s.dx) / 260))
  }
  const up = () => {
    const s = st.current; st.current = null; const el = ref.current
    if (!s || !el) return
    const w = el.getBoundingClientRect().width || 200
    const v = Math.abs(s.dx) / Math.max(1, performance.now() - s.t0)
    el.style.transition = ''
    if (Math.abs(s.dx) < 6) { onDismiss(); return } // tap
    if (Math.abs(s.dx) > w * 0.35 || v > 0.5) { setGone(s.dx > 0 ? 1 : -1); window.setTimeout(onDismiss, 160); return }
    el.style.translate = ''; el.style.opacity = ''
  }
  return (
    <div
      ref={ref}
      className={`toast ${className || 'share-toast'}${gone ? ' is-gone' : ''}${gone < 0 ? ' left' : ''}`}
      role="status"
      aria-live="polite"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <span className="toast-msg">{children}</span>
      {action ? (
        <button type="button" className="toast-act" onClick={() => action.run()}>
          {action.label}
        </button>
      ) : null}
      <button type="button" className="toast-x" aria-label="Dismiss" onClick={onDismiss} />
    </div>
  )
}
