/** v0.30.1 (t4u) — version injected at build from package.json (vite.config `define`). Never hardcode it. */
export const APP_VERSION: string = __APP_VERSION__
/** v0.46.1 (Steve t43u): the label comes from the build: the Beta site (VITE_SOW_FLAVOR=beta) or a prerelease version = Beta,
 *  otherwise Stable. (Was hard-coded 'Beta' since v0.42.0.) */
export function channelLabelFor(version: string, flavor: string | undefined): 'Stable' | 'Beta' {
  return flavor === 'beta' || version.includes('-') ? 'Beta' : 'Stable'
}
export const APP_CHANNEL: 'Stable' | 'Beta' = channelLabelFor(APP_VERSION, typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SOW_FLAVOR : undefined)

export function versionLabel(): string {
  return `v${APP_VERSION} ${APP_CHANNEL} · Quiet Lucid`
}
