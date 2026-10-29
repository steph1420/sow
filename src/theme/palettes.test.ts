import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings, putSettings } from '../data/api'
import { resetDbForTests } from '../data/db'
import { PALETTES, contrast, paletteVars } from './palettes'

beforeEach(async () => { await resetDbForTests() })

describe('v0.35.0 colour themes (themepicker-mj1 / theme-mj2-all)', () => {
  it('Default (Quiet Lucid) first, then the 8 tweakcn themes in order', () => {
    expect(PALETTES.map((p) => p.name)).toEqual([
      'Default (Quiet Lucid)', 'Tangerine Orange', 'Agartha theme', 'Sky', 'ExploreMiam',
      'Minimal Forest', 'Vivid Sky', 'CuteSpringTheme', 'Black and pink',
    ])
  })
  it('default sets no overrides; every theme has Night and Day', () => {
    expect(paletteVars('default', 'night')).toEqual({})
    for (const p of PALETTES.slice(1)) for (const m of ['night', 'day'] as const) {
      const v = paletteVars(p.id, m)
      expect(v['--bg'], p.id + m).toMatch(/^#[0-9a-f]{6}$/)
      expect(v['--primary']).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
  it('Submitted / Warn / Left colours stay fixed', () => {
    for (const p of PALETTES) for (const m of ['night', 'day'] as const) {
      const v = paletteVars(p.id, m)
      expect(v['--sub']).toBeUndefined(); expect(v['--warn']).toBeUndefined(); expect(v['--danger']).toBeUndefined()
    }
  })
  it('ticks visible: primary ≥3:1 vs card and bg (theme 7 Day deepened)', () => {
    for (const p of PALETTES.slice(1)) for (const m of ['night', 'day'] as const) {
      const v = paletteVars(p.id, m)
      expect(contrast(v['--primary'], v['--surface']), `${p.id} ${m}`).toBeGreaterThanOrEqual(3)
      expect(contrast(v['--on-primary'], v['--primary']), `${p.id} ${m} glyph`).toBeGreaterThanOrEqual(3)
    }
  })
  it('text colours meet AA 4.5:1 on bg and surface', () => {
    for (const p of PALETTES.slice(1)) for (const m of ['night', 'day'] as const) {
      const v = paletteVars(p.id, m)
      for (const k of ['--text', '--text-sec', '--text-ter', '--ok']) for (const b of ['--bg', '--surface'])
        expect(contrast(v[k], v[b]), `${p.id} ${m} ${k}/${b}`).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('choice persists in IndexedDB', async () => {
    expect((await getSettings()).palette ?? 'default').toBe('default')
    await putSettings({ palette: '6-vivid-sky' })
    expect((await getSettings()).palette).toBe('6-vivid-sky')
  })
  it('no theme font is shipped (system font only)', () => {
    for (const m of ['night', 'day'] as const) for (const p of PALETTES) expect(paletteVars(p.id, m)['font-family']).toBeUndefined()
  })
})
