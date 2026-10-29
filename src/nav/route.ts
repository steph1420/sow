/**
 * P1-1 (v0.27.0) — hash routes so reload restores the current screen.
 *   ''                      Overview
 *   #checklist/<ClassKey>   Checklist for a class
 *   #settings/sync          More stack (each segment one back-step)
 * Overlays (More popup, Tools, Search) are intentionally not encoded.
 */
import { CLASS_KEYS, type ClassKey } from '../data/types'
import type { MoreRouteId, MoreStack } from '../more/navStack'

const MORE: MoreRouteId[] = ['roster', 'history', 'settings', 'dev', 'sync', 'appearance', 'subjects', 'about', 'sharing']

export type Route = { tab: 'overview' | 'checklist'; classKey?: ClassKey; stack: MoreStack }

export function parseRoute(hash: string, pathname = ''): Route {
  const h = hash.replace(/^#\/?/, '')
  const parts = h.split('/').filter(Boolean).map((p) => decodeURIComponent(p))
  if (parts[0] === 'checklist' || (!parts.length && /\/checklist\/?$/.test(pathname))) {
    const k = parts[1] as ClassKey | undefined
    return { tab: 'checklist', classKey: k && CLASS_KEYS.includes(k) ? k : undefined, stack: [] }
  }
  const stack: MoreStack = []
  for (const p of parts) {
    if (!MORE.includes(p as MoreRouteId)) break
    if (stack[stack.length - 1] !== p) stack.push(p as MoreRouteId)
  }
  return { tab: 'overview', stack }
}

export function formatRoute(r: Route): string {
  if (r.stack.length) return '#' + r.stack.join('/')
  if (r.tab === 'checklist') return '#checklist' + (r.classKey ? '/' + encodeURIComponent(r.classKey) : '')
  return ''
}
