import { z } from 'zod'
import { EXAMS } from '../content/schema'
import { normalizeSettings, type SettingsData } from '../settings/settings'
import { replayCard } from '../srs/fsrs'
import type { CardRecord, Json, ReviewRecord, TableName, TableRows } from './types'

/*
 * Бекъпът е един JSON файл с настройките и всички таблици (раздел 2 от SPEC). Импортът слива
 * и не трие: дневниците се обединяват по id, а в останалите таблици за всеки id остава
 * по-новият запис. Карта, преглеждана и на двете устройства, се преизчислява от общата история.
 */

export const BACKUP_APP = 'aye'
/** Форматът на файла. При промяна — нов номер и миграция в `migrateBackup`. */
export const BACKUP_FORMAT = 1

export type BackupFile = {
  app: typeof BACKUP_APP
  format: number
  exportedAt: number
  settings: SettingsData
  tables: TableRows
}

// ——— Проверка на файла ———

const id = z.string().min(1)
const time = z.number().finite()
const count = z.number().int().nonnegative()
const rating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
const cardState = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
const confidence = rating
const json: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(json),
    z.record(z.string(), json),
  ]),
)
const attemptMode = z.enum(['practice', 'errors', 'exam', 'challenge'])

const card = z.object({
  id,
  due: time,
  stability: z.number(),
  difficulty: z.number(),
  scheduledDays: z.number(),
  learningSteps: count,
  reps: count,
  lapses: count,
  state: cardState,
  lastReview: time.nullable(),
  updatedAt: time,
})

const review = z.object({
  id,
  cardId: id,
  at: time,
  rating,
  mode: z.enum(['srs', 'cram']),
  stateBefore: cardState,
  durationMs: z.number().nonnegative(),
  confidence: confidence.optional(),
  sessionId: id.optional(),
})

const partScore = z.object({ key: z.string(), score: z.number(), max: z.number() })

const attempt = z.object({
  id,
  itemId: id,
  at: time,
  mode: attemptMode,
  response: json,
  score: z.number(),
  max: z.number(),
  parts: z.array(partScore).optional(),
  durationMs: z.number().nonnegative(),
  confidence: confidence.optional(),
  sessionId: id.optional(),
  examId: id.optional(),
})

const error = z.object({
  id,
  itemId: id,
  status: z.enum(['active', 'mastered']),
  wrongCount: count,
  streak: count,
  firstWrongAt: time,
  lastWrongAt: time,
  lastRightAt: time.nullable(),
  masteredAt: time.nullable(),
  lastMode: attemptMode,
  lastResponse: json,
  updatedAt: time,
})

const sessionScope = z.object({
  exam: z.enum(EXAMS).optional(),
  decks: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.array(z.number()).optional(),
})

const session = z.object({
  id,
  mode: z.enum(['srs', 'cram', 'practice', 'errors', 'challenge']),
  status: z.enum(['active', 'done']),
  startedAt: time,
  endedAt: time.nullable(),
  updatedAt: time,
  scope: sessionScope,
  queue: z.array(z.string()),
  position: count,
  stats: z.object({
    answered: count,
    correct: count,
    ratings: z.tuple([count, count, count, count]),
  }),
  undo: z
    .object({
      reviewId: id,
      cardId: id,
      before: card.nullable(),
      position: count,
      queue: z.array(z.string()).optional(),
    })
    .nullable(),
})

const exam = z.object({
  id,
  exam: z.enum(EXAMS),
  kind: z.string(),
  parts: z.array(z.object({ id: z.string(), title: z.string(), items: z.array(z.string()) })),
  answers: z.record(z.string(), json),
  flagged: z.array(z.string()),
  timeByItem: z.record(z.string(), z.number()),
  elapsedMs: z.number().nonnegative(),
  limitMs: z.number().nonnegative(),
  status: z.enum(['active', 'finished', 'abandoned']),
  startedAt: time,
  finishedAt: time.nullable(),
  updatedAt: time,
  result: z
    .object({
      score: z.number(),
      max: z.number(),
      parts: z.array(z.object({ id: z.string(), score: z.number(), max: z.number() })),
    })
    .nullable(),
})

const writing = z.object({
  id,
  pieceId: id,
  version: count,
  taskId: id.nullable(),
  genre: z.string(),
  status: z.enum(['draft', 'saved']),
  plan: z.object({ thesis: z.string(), points: z.array(z.string()) }).nullable(),
  text: z.string(),
  words: count,
  seconds: z.number().nonnegative(),
  selfScores: z.record(z.string(), z.number()).nullable(),
  checklist: z.array(z.boolean()).nullable(),
  examId: id.nullable(),
  createdAt: time,
  updatedAt: time,
})

const check = z.object({
  id,
  status: z.enum(['ok', 'problem']),
  note: z.string(),
  hash: z.string(),
  at: time,
  updatedAt: time,
})

const tables = z.object({
  cards: z.array(card).default([]),
  reviews: z.array(review).default([]),
  attempts: z.array(attempt).default([]),
  errors: z.array(error).default([]),
  sessions: z.array(session).default([]),
  exams: z.array(exam).default([]),
  writings: z.array(writing).default([]),
  checks: z.array(check).default([]),
})

// Схемата трябва да описва точно типовете от types.ts.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const tablesMatch: Same<z.infer<typeof tables>, TableRows> = true
void tablesMatch

const backupFile = z.object({
  app: z.literal(BACKUP_APP),
  format: z.number().int().positive(),
  exportedAt: time,
  settings: z.unknown(),
  tables: z.unknown(),
})

export class BackupError extends Error {}

/**
 * Проверява и обновява до текущия формат файл, прочетен като JSON. Грешките са на български
 * и могат да се покажат направо.
 */
export function parseBackup(value: unknown): BackupFile {
  const head = backupFile.safeParse(value)
  if (!head.success) throw new BackupError('Файлът не е бекъп на AYE.')
  if (head.data.format > BACKUP_FORMAT) {
    throw new BackupError('Бекъпът е от по-нова версия на AYE. Обнови приложението и опитай пак.')
  }
  const migrated = migrateBackup(head.data.format, head.data.tables)
  const rows = tables.safeParse(migrated)
  if (!rows.success) {
    const first = rows.error.issues[0]
    const where = first ? first.path.join('.') : ''
    throw new BackupError(`Бекъпът е повреден${where ? ` (${where})` : ''}.`)
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: head.data.exportedAt,
    settings: normalizeSettings(head.data.settings),
    tables: rows.data,
  }
}

/** Обновява таблиците от стар формат до текущия. Формат 1 е първият — още няма миграции. */
export function migrateBackup(format: number, rows: unknown): unknown {
  if (format === BACKUP_FORMAT) return rows
  throw new BackupError(`Непознат формат на бекъпа: ${format}.`)
}

// ——— Сливане ———

type Mutable = { id: string; updatedAt: number }

/** Редовете от импорта, които са нови или по-нови от местните. */
export function newerRows<T extends Mutable>(
  local: ReadonlyMap<string, T>,
  incoming: readonly T[],
): T[] {
  return incoming.filter((row) => {
    const mine = local.get(row.id)
    return !mine || row.updatedAt > mine.updatedAt
  })
}

/** Редовете от дневник, които ги няма тук. */
export function newLogRows<T extends { id: string }>(
  localIds: ReadonlySet<string>,
  incoming: readonly T[],
): T[] {
  return incoming.filter((row) => !localIds.has(row.id))
}

function groupByCard(reviews: readonly ReviewRecord[]): Map<string, ReviewRecord[]> {
  const groups = new Map<string, ReviewRecord[]>()
  for (const row of reviews) {
    if (row.mode !== 'srs') continue
    groups.set(row.cardId, [...(groups.get(row.cardId) ?? []), row])
  }
  return groups
}

export type CardMergeInput = {
  localCards: ReadonlyMap<string, CardRecord>
  incomingCards: readonly CardRecord[]
  /** Местните оценки на засегнатите карти. */
  localReviews: readonly ReviewRecord[]
  /** Оценките от импорта (всички). */
  incomingReviews: readonly ReviewRecord[]
}

/**
 * Картите след импорт. Ако картата има оценки само на едното устройство, печели по-новият
 * ред. Ако има нови оценки и на двете — картата се преизчислява от общата история.
 */
export function mergeCards({
  localCards,
  incomingCards,
  localReviews,
  incomingReviews,
}: CardMergeInput): { cards: CardRecord[]; recomputed: number } {
  const localIds = new Set(localReviews.map((row) => row.id))
  const incomingIds = new Set(incomingReviews.map((row) => row.id))
  const localByCard = groupByCard(localReviews)
  const incomingByCard = groupByCard(incomingReviews)
  const incomingCardById = new Map(incomingCards.map((row) => [row.id, row]))
  const affected = new Set([...incomingCardById.keys(), ...incomingByCard.keys()])

  const cards: CardRecord[] = []
  let recomputed = 0
  for (const cardId of affected) {
    const mine = localByCard.get(cardId) ?? []
    const theirs = incomingByCard.get(cardId) ?? []
    const onlyHere = mine.some((row) => !incomingIds.has(row.id))
    const onlyThere = theirs.filter((row) => !localIds.has(row.id))
    if (onlyHere && onlyThere.length > 0) {
      const replayed = replayCard(cardId, [...mine, ...onlyThere])
      if (replayed) {
        cards.push(replayed)
        recomputed += 1
      }
      continue
    }
    const incoming = incomingCardById.get(cardId)
    const local = localCards.get(cardId)
    if (incoming && (!local || incoming.updatedAt > local.updatedAt)) cards.push(incoming)
  }
  return { cards, recomputed }
}

export type ImportSummary = { [T in TableName]: number } & { recomputedCards: number }
