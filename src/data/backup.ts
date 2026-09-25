import {
  BACKUP_APP,
  BACKUP_FORMAT,
  mergeCards,
  newLogRows,
  newerRows,
  type BackupFile,
  type ImportSummary,
} from '../domain/progress/backup'
import type { TableRows } from '../domain/progress/types'
import type { SettingsData } from '../domain/settings/settings'
import { db, type AyeDb } from './db'

/*
 * Експорт и импорт на цялата база (раздел 2 от SPEC). Настройките се подават отвън, защото
 * живеят в localStorage (src/data/settingsStore.ts).
 */

export async function createBackup(
  settings: SettingsData,
  now: number,
  database: AyeDb = db,
): Promise<BackupFile> {
  const tables: TableRows = await database.transaction('r', database.tables, async () => ({
    cards: await database.cards.toArray(),
    reviews: await database.reviews.toArray(),
    attempts: await database.attempts.toArray(),
    errors: await database.errors.toArray(),
    sessions: await database.sessions.toArray(),
    exams: await database.exams.toArray(),
    writings: await database.writings.toArray(),
    checks: await database.checks.toArray(),
  }))
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now, settings, tables }
}

/** Името на файла: aye-backup-2026-09-25.json (по местната дата). */
export function backupFileName(now: number): string {
  const date = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `aye-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

function byId<T extends { id: string }>(rows: (T | undefined)[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) if (row) map.set(row.id, row)
  return map
}

/**
 * Слива бекъпа с базата в една транзакция. Връща колко реда са добавени или обновени
 * във всяка таблица. Нищо не се трие.
 */
export async function importBackup(file: BackupFile, database: AyeDb = db): Promise<ImportSummary> {
  const incoming = file.tables
  return database.transaction('rw', database.tables, async () => {
    // Картите се сливат преди дневниците, за да се види кои оценки са били само тук.
    const cardIds = [
      ...new Set([
        ...incoming.cards.map((row) => row.id),
        ...incoming.reviews.map((row) => row.cardId),
      ]),
    ]
    const cardMerge = mergeCards({
      localCards: byId(await database.cards.bulkGet(cardIds)),
      incomingCards: incoming.cards,
      localReviews: await database.reviews.where('cardId').anyOf(cardIds).toArray(),
      incomingReviews: incoming.reviews,
    })

    const reviewIds = new Set(await database.reviews.toCollection().primaryKeys())
    const reviews = newLogRows(reviewIds, incoming.reviews)
    const attemptIds = new Set(await database.attempts.toCollection().primaryKeys())
    const attempts = newLogRows(attemptIds, incoming.attempts)

    const errors = newerRows(
      byId(await database.errors.bulkGet(incoming.errors.map((row) => row.id))),
      incoming.errors,
    )
    const sessions = newerRows(
      byId(await database.sessions.bulkGet(incoming.sessions.map((row) => row.id))),
      incoming.sessions,
    )
    const exams = newerRows(
      byId(await database.exams.bulkGet(incoming.exams.map((row) => row.id))),
      incoming.exams,
    )
    const writings = newerRows(
      byId(await database.writings.bulkGet(incoming.writings.map((row) => row.id))),
      incoming.writings,
    )
    const checks = newerRows(
      byId(await database.checks.bulkGet(incoming.checks.map((row) => row.id))),
      incoming.checks,
    )

    await database.cards.bulkPut(cardMerge.cards)
    await database.reviews.bulkAdd(reviews)
    await database.attempts.bulkAdd(attempts)
    await database.errors.bulkPut(errors)
    await database.sessions.bulkPut(sessions)
    await database.exams.bulkPut(exams)
    await database.writings.bulkPut(writings)
    await database.checks.bulkPut(checks)

    return {
      cards: cardMerge.cards.length,
      reviews: reviews.length,
      attempts: attempts.length,
      errors: errors.length,
      sessions: sessions.length,
      exams: exams.length,
      writings: writings.length,
      checks: checks.length,
      recomputedCards: cardMerge.recomputed,
    }
  })
}
