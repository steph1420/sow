import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listMarks, listStudents } from './api'
import { resetDbForTests } from './db'
import { loadWorkspaceFromIdb, seedDemoWorkspaceToIdb } from './persistWorkspace'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await resetDbForTests()
})

describe('persistWorkspace', () => {
  it('seeds demo and reloads marks map', async () => {
    await seedDemoWorkspaceToIdb()
    const loaded = await loadWorkspaceFromIdb()
    expect(loaded.hasStudents).toBe(true)
    expect(loaded.rosters.KGA_Eng_CW.length).toBe(42)
    expect(Object.keys(loaded.marksByClass.KGA_Eng_CW).length).toBeGreaterThan(0)
    expect((await listStudents('KGB_Eng_CW')).length).toBe(44)
    expect((await listMarks('KGA_Eng_CW')).length).toBeGreaterThan(0)
  })

  it('seedIfEmpty is idempotent', async () => {
    expect((await seedIfEmpty()).seeded).toBe(true)
    expect((await seedIfEmpty()).seeded).toBe(false)
  })
})
