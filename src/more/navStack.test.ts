import { describe, expect, it } from 'vitest'
import { popRoute, pushRoute, topRoute } from './navStack'

describe('more navStack', () => {
  it('push settings then dev; pop returns to settings only', () => {
    let s = pushRoute([], 'settings')
    expect(topRoute(s)).toBe('settings')
    s = pushRoute(s, 'dev')
    expect(s).toEqual(['settings', 'dev'])
    s = popRoute(s)
    expect(s).toEqual(['settings'])
    s = popRoute(s)
    expect(s).toEqual([])
    expect(topRoute(s)).toBe(null)
  })

  it('settings → appearance → subjects stack', () => {
    let s = pushRoute([], 'settings')
    s = pushRoute(s, 'appearance')
    s = pushRoute(s, 'subjects')
    expect(topRoute(s)).toBe('subjects')
    s = popRoute(s)
    expect(topRoute(s)).toBe('appearance')
  })

  it('pop on empty is safe', () => {
    expect(popRoute([])).toEqual([])
  })
})
