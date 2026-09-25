import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { parseBackup } from '../domain/progress/backup'
import { T0, sampleRows } from '../domain/progress/fixtures'
import { DEFAULT_SETTINGS } from '../domain/settings/settings'
import { backupFileName, createBackup, importBackup } from './backup'
import { openDb, type AyeDb } from './db'

function fresh(): AyeDb {
  return openDb('aye-test', { indexedDB: new IDBFactory(), IDBKeyRange })
}

async function fill(database: AyeDb): Promise<void> {
  const rows = sampleRows()
  await database.transaction('rw', database.tables, async () => {
    await database.cards.bulkPut(rows.cards)
    await database.reviews.bulkPut(rows.reviews)
    await database.attempts.bulkPut(rows.attempts)
    await database.errors.bulkPut(rows.errors)
    await database.sessions.bulkPut(rows.sessions)
    await database.exams.bulkPut(rows.exams)
    await database.writings.bulkPut(rows.writings)
    await database.checks.bulkPut(rows.checks)
  })
}

describe('експорт и импорт', () => {
  it('бекъпът минава през JSON и се възстановява в празна база без загуби', async () => {
    const source = fresh()
    await fill(source)
    const backup = await createBackup(DEFAULT_SETTINGS, T0, source)
    const parsed = parseBackup(JSON.parse(JSON.stringify(backup)))

    const target = fresh()
    const summary = await importBackup(parsed, target)
    expect(summary).toMatchObject({ cards: 1, reviews: 2, attempts: 1, checks: 1 })
    expect((await createBackup(DEFAULT_SETTINGS, T0, target)).tables).toEqual(sampleRows())
  })

  it('повторен импорт не добавя нищо', async () => {
    const database = fresh()
    await fill(database)
    const backup = parseBackup(
      JSON.parse(JSON.stringify(await createBackup(DEFAULT_SETTINGS, T0, database))),
    )
    const summary = await importBackup(backup, database)
    expect(Object.values(summary).every((count) => count === 0)).toBe(true)
  })

  it('пази по-новия ред и добавя липсващите', async () => {
    const database = fresh()
    await fill(database)
    const rows = sampleRows()
    const [check] = rows.checks
    const [error] = rows.errors
    if (!check || !error) throw new Error('Липсват примерни редове.')
    const backup = parseBackup({
      app: 'aye',
      format: 1,
      exportedAt: T0,
      settings: {},
      tables: {
        checks: [{ ...check, status: 'ok', updatedAt: check.updatedAt + 1 }],
        errors: [{ ...error, wrongCount: 9, updatedAt: error.updatedAt - 1 }],
        reviews: [{ ...rows.reviews[0], id: '0mfz4a1c9-zzzzzzzzzzzzzz', at: T0 + 1 }],
      },
    })
    const summary = await importBackup(backup, database)
    expect(summary).toMatchObject({ checks: 1, errors: 0, reviews: 1 })
    expect((await database.checks.get(check.id))?.status).toBe('ok')
    expect((await database.errors.get(error.id))?.wrongCount).toBe(1)
    expect(await database.reviews.count()).toBe(3)
  })

  it('името на файла съдържа местната дата', () => {
    expect(backupFileName(new Date(2026, 8, 5, 23, 30).getTime())).toBe(
      'aye-backup-2026-09-05.json',
    )
  })
})
