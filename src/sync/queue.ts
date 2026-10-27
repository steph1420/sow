import { getDb, type SyncQueueRow } from '../db/db'

export type SyncOp = SyncQueueRow

export async function enqueue(
  op: Omit<SyncQueueRow, 'id' | 'createdAt'> & { id?: string },
): Promise<SyncOp> {
  const db = await getDb()
  const row: SyncQueueRow = {
    ...op,
    id: op.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await db.put('syncQueue', row)
  return row
}

export async function listQueue(): Promise<SyncOp[]> {
  const db = await getDb()
  return db.getAll('syncQueue')
}

export async function clearQueue(): Promise<void> {
  const db = await getDb()
  await db.clear('syncQueue')
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('syncQueue', id)
}
