/** v0.30.1 (t4u) — version injected at build from package.json (vite.config `define`). Never hardcode it. */
export const APP_VERSION: string = __APP_VERSION__
/** v0.42.0 (Rule 15, t110u/t112u): new work ships as Beta. The Stable/Beta switch itself is still pending — label only. */
export const APP_CHANNEL: 'Stable' | 'Beta' = 'Beta'

export function versionLabel(): string {
  return `v${APP_VERSION} ${APP_CHANNEL} · Quiet Lucid`
}
