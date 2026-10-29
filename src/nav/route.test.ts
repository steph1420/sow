import { describe, expect, it } from 'vitest'
import { formatRoute, parseRoute } from './route'

describe('P1-1 hash routes', () => {
  it('round-trips checklist with class', () => {
    const r = parseRoute('#checklist/KGB_Eng_HW')
    expect(r).toEqual({ tab: 'checklist', classKey: 'KGB_Eng_HW', stack: [] })
    expect(formatRoute(r)).toBe('#checklist/KGB_Eng_HW')
  })
  it('legacy #checklist and bad class', () => {
    expect(parseRoute('#checklist').tab).toBe('checklist')
    expect(parseRoute('#checklist/Nope').classKey).toBeUndefined()
  })
  it('More stack', () => {
    const r = parseRoute('#settings/sync')
    expect(r.stack).toEqual(['settings', 'sync'])
    expect(formatRoute(r)).toBe('#settings/sync')
    expect(parseRoute('#settings/evil/sync').stack).toEqual(['settings'])
  })
  it('overview', () => {
    expect(parseRoute('')).toEqual({ tab: 'overview', stack: [] })
    expect(formatRoute({ tab: 'overview', stack: [] })).toBe('')
  })
})
