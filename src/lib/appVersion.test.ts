// v0.30.1 (Steve t4u "Stuck in 0.29.0") — the shown version comes from package.json, never a literal.
import { describe, expect, it } from 'vitest'
import { APP_VERSION, versionLabel } from './appVersion'

import pkgRaw from '../../package.json?raw'

const pkg = JSON.parse(pkgRaw) as { version: string }
const SOURCES = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('app version', () => {
  it('equals package.json version', () => {
    expect(APP_VERSION).toBe(pkg.version)
    expect(versionLabel()).toBe(`v${pkg.version} ${pkg.version.includes("-") ? "Beta" : "Stable"} · Quiet Lucid`) // v0.46.1 (t43u): label from the build
  })
  it('no hardcoded version literal in UI code (outside comments)', () => {
    const files = Object.keys(SOURCES).filter((f) => !/\.test\./.test(f))
    expect(files.length).toBeGreaterThan(20)
    const hits: string[] = []
    for (const f of files) {
      const code = SOURCES[f]!.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      for (const m of code.matchAll(/v?\d+\.\d+\.\d+/g)) hits.push(`${f}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })
})

// v0.46.1 (Steve t43u): /sow/ shows "Stable"; the Beta site or any prerelease shows "Beta".
import { channelLabelFor } from './appVersion'
describe('channel label from the build (t43u)', () => {
  it('stable build of a release version → Stable', () => { expect(channelLabelFor('0.46.1', undefined)).toBe('Stable') })
  it('Beta site build → Beta', () => { expect(channelLabelFor('0.46.1', 'beta')).toBe('Beta') })
  it('prerelease version → Beta even on /sow/', () => { expect(channelLabelFor('0.46.0-beta.4', undefined)).toBe('Beta') })
})
