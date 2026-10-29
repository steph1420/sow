/** v0.30.1 (t4u) — version injected at build from package.json (vite.config `define`). Never hardcode it. */
export const APP_VERSION: string = __APP_VERSION__

export function versionLabel(): string {
  return `v${APP_VERSION} · Quiet Lucid`
}
