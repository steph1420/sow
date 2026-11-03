/**
 * v0.47.1 (Steve t127u): the top panel is collapsed/expanded ONLY by its chevron button.
 * Scrolling and A–Z jumps never change it (an upward A–Z jump used to bring it back).
 */
import { flavorKey } from '../sync/channel'

export const PANEL_COLLAPSE_KEY = flavorKey('sow.panelCollapsed')

export type PanelAction = { type: 'toggle' } | { type: 'scroll'; dy: number; atTop: boolean } | { type: 'azJump'; dy: number }

export function panelReducer(collapsed: boolean, a: PanelAction): boolean {
  return a.type === 'toggle' ? !collapsed : collapsed
}

export function readCollapsed(): boolean {
  try { return localStorage.getItem(PANEL_COLLAPSE_KEY) === '1' } catch { return false }
}
export function writeCollapsed(v: boolean): void {
  try { localStorage.setItem(PANEL_COLLAPSE_KEY, v ? '1' : '0') } catch { /* private mode */ }
}
