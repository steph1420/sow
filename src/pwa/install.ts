/**
 * v0.35.1 Install as app (Steve t52u: Settings › App, one-time nudge).
 * Android / desktop Chrome & Edge: the captured `beforeinstallprompt` → prompt().
 * iOS (no prompt API): Share › Add to Home Screen steps sheet. Hidden once standalone.
 */
import { useEffect, useState } from 'react'

export type InstallMode = 'prompt' | 'ios' | 'none'
export const NUDGE_KEY = 'sow-app.installNudgeSeen'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIPEvent | null = null
let installed = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
}

export function isStandalone(win: Pick<Window, 'matchMedia'>, nav: Partial<Navigator> & { standalone?: boolean }): boolean {
  try { if (win.matchMedia('(display-mode: standalone)').matches) return true } catch { /* no matchMedia */ }
  return nav.standalone === true
}

export function installMode(o: { ua: string; standalone: boolean; hasPrompt: boolean }): InstallMode {
  if (o.standalone) return 'none'
  if (o.hasPrompt) return 'prompt'
  if (isIOS(o.ua)) return 'ios'
  return 'none'
}

export function shouldNudge(mode: InstallMode): boolean {
  if (mode === 'none') return false
  try { return !localStorage.getItem(NUDGE_KEY) } catch { return false }
}
export function markNudgeSeen(): void {
  try { localStorage.setItem(NUDGE_KEY, new Date().toISOString()) } catch { /* private mode */ }
}

/** Call once at startup, before React, so an early beforeinstallprompt is not missed. */
export function captureInstallPrompt(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; emit() })
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit() })
}

export function currentInstallMode(): InstallMode {
  if (typeof window === 'undefined' || installed) return 'none'
  return installMode({ ua: navigator.userAgent, standalone: isStandalone(window, navigator as Navigator & { standalone?: boolean }), hasPrompt: !!deferred })
}

export async function runInstallPrompt(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  await e.prompt()
  const r = await e.userChoice.catch(() => ({ outcome: 'dismissed' }))
  deferred = null
  if (r.outcome === 'accepted') installed = true
  emit()
  return r.outcome === 'accepted'
}

export function useInstallMode(): InstallMode {
  const [m, setM] = useState<InstallMode>(() => currentInstallMode())
  useEffect(() => {
    const f = () => setM(currentInstallMode())
    subs.add(f)
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', f)
    return () => { subs.delete(f); mq?.removeEventListener?.('change', f) }
  }, [])
  return m
}
