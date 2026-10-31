import { describe, expect, it } from 'vitest'
import { maskUrl } from './maskUrl'
describe('v0.44.5: Connections field never shows the full Beta URL', () => {
  it('masks the deployment id', () => {
    const u = 'https://script.google.com/macros/s/AKfycbxU01l41mPcriTlPOXsrvh3krmiWuRh97UM1McXO9vZoJPF07woCDF17gLvnwOoYXkAtA/exec'
    const m = maskUrl(u)
    expect(m).not.toContain('AKfycbxU01l41mPcriTlPOXsrv')
    expect(m).toMatch(/^https:\/\/script\.google\.com\/.*•+.*\/exec$/)
  })
  it('empty stays empty', () => expect(maskUrl('')).toBe(''))
})
