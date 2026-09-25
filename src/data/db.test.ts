import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { T0, sampleRows, type TableRows } from '../domain/progress/fixtures'
import { TABLE_NAMES } from '../domain/progress/types'
import { DB_VERSION, SCHEMA, openDb, type AyeDb } from './db'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

/** Нов празен фалшив indexedDB за всеки тест. */
function fake() {
  return { indexedDB: new IDBFactory(), IDBKeyRange }
}

async function fill(db: Dexie, rows: Partial<TableRows>): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      const list = rows[table.name as keyof TableRows]
      if (list) await table.bulkPut(list)
    }
  })
}

async function readAll(db: AyeDb): Promise<TableRows> {
  const entries = await Promise.all(
    TABLE_NAMES.map(async (name) => [name, await db.table(name).toArray()] as const),
  )
  return Object.fromEntries(entries) as TableRows
}

/**
 * Редовете във вида, в който ги пише всяка версия на схемата. Когато нова версия смени вида
 * на редовете, старият вид се замразява тук, а sampleRows() остава текущият.
 */
const ROWS_AT_VERSION: Readonly<Record<number, () => TableRows>> = {
  1: sampleRows,
}

describe('базата на прогреса', () => {
  it('има всички таблици от схемата, всяка с ключ id', async () => {
    const db = openDb('aye-test', fake())
    await db.open()
    expect(db.verno).toBe(DB_VERSION)
    expect(db.tables.map((table) => table.name).sort()).toEqual([...TABLE_NAMES].sort())
    for (const table of db.tables) expect(table.schema.primKey.keyPath).toBe('id')
    db.close()
  })

  it('търси по индексите', async () => {
    const db = openDb('aye-test', fake())
    await fill(db, sampleRows())

    expect(
      await db.cards
        .where('due')
        .belowOrEqual(T0 + 3 * DAY)
        .count(),
    ).toBe(1)
    expect(
      await db.cards
        .where('due')
        .below(T0 + DAY)
        .count(),
    ).toBe(0)
    expect(await db.reviews.where('cardId').equals('bel-gram-chlen-001#c1').count()).toBe(2)
    expect(
      await db.reviews
        .where('at')
        .between(T0 - HOUR, T0, true, true)
        .count(),
    ).toBe(2)
    expect(await db.attempts.where('itemId').equals('cae-uoe-part1-001').count()).toBe(1)
    expect(await db.errors.where('status').equals('active').primaryKeys()).toEqual([
      'cae-uoe-part1-001#g2',
    ])
    expect(await db.sessions.where('status').equals('done').count()).toBe(1)
    expect(await db.exams.where('status').equals('active').count()).toBe(1)
    expect(await db.writings.where('taskId').equals('cae-writing-essay-001').count()).toBe(1)
    db.close()
  })

  it('данните от всяка версия на схемата оцеляват при отваряне с текущата', async () => {
    for (const step of SCHEMA) {
      const options = fake()
      const old = new Dexie('aye', options)
      for (const earlier of SCHEMA.filter((s) => s.version <= step.version)) {
        const version = old.version(earlier.version).stores(earlier.stores)
        if (earlier.upgrade) version.upgrade(earlier.upgrade)
      }
      const rows = ROWS_AT_VERSION[step.version]
      expect(rows, `липсват примерни редове за версия ${step.version}`).toBeDefined()
      await fill(old, rows?.() ?? {})
      old.close()

      const current = openDb('aye', options)
      expect(await readAll(current)).toEqual(sampleRows())
      current.close()
    }
  })
})
