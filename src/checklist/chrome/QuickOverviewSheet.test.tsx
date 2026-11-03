import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { QuickOverviewSheet } from './QuickOverviewSheet'

describe('Quick overview Share footer (2a, t118u)', () => {
  it('footer row has Share then Close', () => {
    const html = renderToString(<QuickOverviewSheet classLabel="KG-A" mode="set" rows={[]} left={0} onClose={() => {}} onShare={() => {}} />)
    expect(html).toContain('qo-actions')
    expect(html.indexOf('qo-share')).toBeGreaterThan(-1)
    expect(html.indexOf('qo-share')).toBeLessThan(html.indexOf('qo-close'))
  })
})
