import { describe, it, expect } from 'vitest'
import { createScrollTween } from './scrollTween'

function rig() {
  let t = 0
  const q: FrameRequestCallback[] = []
  const el = { scrollTop: 0 }
  const tw = createScrollTween(el, { duration: 150, now: () => t, raf: (cb) => (q.push(cb), q.length), caf: () => { q.length = 0 } })
  const tick = (ms: number) => { t += ms; const cb = q.shift(); cb?.(t) }
  return { el, tw, tick }
}

describe('scrollTween', () => {
  it('reaches target in ~150ms with ease-out', () => {
    const { el, tw, tick } = rig()
    tw.to(1000)
    tick(16)
    expect(el.scrollTop).toBeGreaterThan(250) // ease-out front-loads
    for (let i = 0; i < 10; i++) tick(16)
    expect(el.scrollTop).toBe(1000)
    expect(tw.active).toBe(false)
  })
  it('retargets mid-flight from current position without jumping', () => {
    const { el, tw, tick } = rig()
    tw.to(1000); tick(50)
    const mid = el.scrollTop
    tw.to(200); tick(1)
    expect(Math.abs(el.scrollTop - mid)).toBeLessThan(60)
    for (let i = 0; i < 12; i++) tick(16)
    expect(el.scrollTop).toBe(200)
  })
})
