import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { getSettings, putPickedPair } from './api'

describe('v0.42.0: picked date pair survives reload (IDB)', () => {
  it('round-trips and clears', async () => {
    await putPickedPair('KGB_Eng_CW', ['2026-10-21', '2026-11-02'])
    expect((await getSettings()).pickedPairs?.KGB_Eng_CW).toEqual(['2026-10-21', '2026-11-02'])
    await putPickedPair('KGB_Eng_CW', null)
    expect((await getSettings()).pickedPairs?.KGB_Eng_CW).toBeUndefined()
  })
})
