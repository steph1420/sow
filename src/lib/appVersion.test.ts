// v0.30.1 (Steve t4u "Stuck in 0.29.0") — the shown version comes from package.json, never a literal.
import { describe, expect, it } from 'vitest'
import { APP_VERSION, versionLabel } from './appVersion'

import pkgRaw from '../../package.json?raw'

const pkg = JSON.parse(pkgRaw) as { version: string }
const SOURCES = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('app version', () => {
  it('equals package.json version', () => {
    expect(APP_VERSION).toBe(pkg.version)
    expect(versionLabel()).toBe(`v${pkg.version} Beta · Quiet Lucid`) // v0.42.0: Beta label (Rule 15)
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
