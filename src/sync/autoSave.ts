/**
 * v0.45.0 (LOCKED A, 2026-11-01): auto-save scheduler.
 * One push after a 2 s pause in ticking · at most 30 s during continuous ticking · flush() now
 * (pagehide / hidden) · offline → queued with a count, saves itself on `online` · error → amber, retry().
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error'
export type AutoSaveState = { status: AutoSaveStatus; pending: number; error?: string }

type Opts = {
  run: () => Promise<unknown>
  isOnline?: () => boolean
  onState?: (s: AutoSaveState) => void
  debounceMs?: number
  maxWaitMs?: number
  savedMs?: number
}

export type AutoSaver = {
  notify: (n?: number) => void
  flush: () => void
  retry: () => void
  online: () => void
  /** Run a push/pull now even with nothing pending (open / return to foreground). */
  pull: () => void
  state: () => AutoSaveState
}

export function createAutoSaver(o: Opts): AutoSaver {
  const debounce = o.debounceMs ?? 2000
  const maxWait = o.maxWaitMs ?? 30000
  const savedMs = o.savedMs ?? 1600
  const isOnline = o.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false)
  let st: AutoSaveState = { status: 'idle', pending: 0 }
  let timer: ReturnType<typeof setTimeout> | null = null
  let fade: ReturnType<typeof setTimeout> | null = null
  let firstAt = 0
  let running = false
  let again = false
  const set = (n: AutoSaveState) => { st = n; o.onState?.(n) }
  const clear = () => { if (timer) clearTimeout(timer); timer = null }

  const go = async (force = false) => {
    clear()
    firstAt = 0
    if (!force && st.pending === 0) return
    if (!isOnline()) { if (st.pending) set({ status: 'queued', pending: st.pending }); return }
    if (running) { again = true; return }
    running = true
    const sent = st.pending
    if (fade) clearTimeout(fade)
    if (sent) set({ status: 'saving', pending: sent })
    try {
      await o.run()
      const left = Math.max(0, st.pending - sent)
      running = false
      if (left || again) {
        again = false
        if (left) { set({ status: 'saving', pending: left }); schedule() }
        else void go(true) // a flush / pull arrived mid-push → run once more, quietly
        if (left) return
        return
      }
      if (sent || st.status === 'error' || st.status === 'queued') {
        set({ status: 'saved', pending: 0 })
        fade = setTimeout(() => { if (st.status === 'saved') set({ status: 'idle', pending: 0 }) }, savedMs)
      }
    } catch (e) {
      running = false
      again = false
      if (!isOnline()) set({ status: 'queued', pending: Math.max(st.pending, sent) })
      else set({ status: 'error', pending: Math.max(st.pending, sent), error: e instanceof Error ? e.message : String(e) })
    }
  }
  const schedule = () => {
    const now = Date.now()
    if (!firstAt) firstAt = now
    clear()
    const wait = Math.max(0, Math.min(debounce, firstAt + maxWait - now))
    timer = setTimeout(() => void go(), wait)
  }
  return {
    notify: (n = 1) => {
      const pending = st.pending + n
      if (!isOnline()) { clear(); set({ status: 'queued', pending }); return }
      st = { ...st, pending }
      if (running) { again = true; return }
      if (st.status === 'error') { set({ status: 'error', pending, error: st.error }); }
      schedule()
    },
    flush: () => void go(),
    retry: () => void go(true),
    online: () => void go(),
    pull: () => void go(true),
    state: () => st,
  }
}
