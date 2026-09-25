import Dexie, { type DexieOptions, type EntityTable, type Transaction } from 'dexie'
import type { ProgressTables, TableName } from '../domain/progress/types'

/**
 * Базата на прогреса в IndexedDB. Всички GitHub Pages сайтове на потребителя споделят
 * един origin, затова името е „aye“.
 */
export const DB_NAME = 'aye'

type SchemaStep = {
  version: number
  /** Ключът и индексите по таблици; null изтрива таблица. Първото поле е ключът. */
  stores: Record<string, string | null>
  /** Преработва редовете при преминаване към тази версия (src/domain/progress/migrations.ts). */
  upgrade?: (tx: Transaction) => Promise<void>
}

/**
 * Историята на схемата. Минала версия не се променя никога — промяната е нова версия
 * с миграция и тест (src/data/db.test.ts проверява, че данните от всяка версия оцеляват).
 */
export const SCHEMA: readonly SchemaStep[] = [
  {
    version: 1,
    stores: {
      cards: 'id, due',
      reviews: 'id, cardId, at',
      attempts: 'id, itemId, at',
      errors: 'id, itemId, status',
      sessions: 'id, status, startedAt',
      exams: 'id, status, startedAt',
      writings: 'id, pieceId, taskId, updatedAt',
      checks: 'id',
    },
  },
]

export const DB_VERSION = Math.max(...SCHEMA.map((step) => step.version))

export type AyeDb = Dexie & { [T in TableName]: EntityTable<ProgressTables[T], 'id'> }

/** Отваря базата с цялата история на схемата. Тестовете подават фалшив indexedDB. */
export function openDb(name: string = DB_NAME, options?: DexieOptions): AyeDb {
  const db = new Dexie(name, options) as AyeDb
  for (const step of SCHEMA) {
    const version = db.version(step.version).stores(step.stores)
    if (step.upgrade) version.upgrade(step.upgrade)
  }
  return db
}

export const db = openDb()
