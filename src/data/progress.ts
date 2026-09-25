import type { ContentItem } from '../domain/content/schema'
import { applyOutcome, outcomesOf } from '../domain/errors/notebook'
import type { EvalResult } from '../domain/eval/types'
import { countByDay } from '../domain/progress/activity'
import { newId } from '../domain/progress/ids'
import { addRating, emptyStats, isStale } from '../domain/progress/session'
import type {
  AttemptMode,
  AttemptRecord,
  CardRecord,
  CheckRecord,
  CheckStatus,
  Confidence,
  ErrorRecord,
  Json,
  Rating,
  ReviewRecord,
  SessionMode,
  SessionRecord,
  SessionScope,
} from '../domain/progress/types'
import { rateCard } from '../domain/srs/fsrs'
import { countDoneToday, requeueAfterAgain, type DoneToday } from '../domain/srs/queue'
import { nextStudyDayStart, studyDay, studyDayStart } from '../domain/time/studyDay'
import { db, type AyeDb } from './db'

/*
 * Операциите с прогреса. Всяка промяна, която засяга няколко таблици, е в една транзакция,
 * за да не остане половин запис при затваряне на приложението. Последният параметър е
 * базата — тестовете подават своя.
 */

// ——— Карти ———

/** Редовете на картите с тези id (новите карти нямат ред). */
export async function getCards(
  ids: readonly string[],
  database: AyeDb = db,
): Promise<Map<string, CardRecord>> {
  const rows = await database.cards.bulkGet([...ids])
  const result = new Map<string, CardRecord>()
  for (const row of rows) if (row) result.set(row.id, row)
  return result
}

/** id на всички карти, които вече имат ред (т.е. не са нови). */
export async function seenCardIds(database: AyeDb = db): Promise<Set<string>> {
  return new Set(await database.cards.toCollection().primaryKeys())
}

/** Картите с падеж преди `before` (преговорите и ученето за деня). */
export function cardsDueBefore(before: number, database: AyeDb = db): Promise<CardRecord[]> {
  return database.cards.where('due').below(before).toArray()
}

/** Колко нови карти и преговори са минати в текущия учебен ден. */
export async function doneToday(now: number, database: AyeDb = db): Promise<DoneToday> {
  const from = studyDayStart(studyDay(now))
  const reviews = await database.reviews.where('at').between(from, now, true, true).toArray()
  return countDoneToday(reviews, now)
}

export type SrsSnapshot = {
  /** Картите с ред в базата (невидените са нови). */
  seen: Set<string>
  /** Картите с падеж до края на учебния ден. */
  due: Map<string, CardRecord>
  done: DoneToday
}

/** Всичко за броенето на картите за деня — за таблото и за екрана с флашкарти. */
export async function srsSnapshot(now: number, database: AyeDb = db): Promise<SrsSnapshot> {
  const [seen, due, done] = await Promise.all([
    seenCardIds(database),
    cardsDueBefore(nextStudyDayStart(now), database),
    doneToday(now, database),
  ])
  return { seen, due: new Map(due.map((row) => [row.id, row])), done }
}

// ——— Сесии ———

async function activeSessions(mode: SessionMode, database: AyeDb): Promise<SessionRecord[]> {
  return database.sessions
    .where('status')
    .equals('active')
    .filter((session) => session.mode === mode)
    .toArray()
}

function closed(session: SessionRecord, now: number): SessionRecord {
  return { ...session, status: 'done', endedAt: session.updatedAt, undo: null, updatedAt: now }
}

/**
 * Незавършената сесия от този вид в текущия учебен ден. Сесиите от минали дни се затварят,
 * защото днешната опашка е различна.
 */
export async function resumableSession(
  mode: SessionMode,
  now: number,
  database: AyeDb = db,
): Promise<SessionRecord | null> {
  return database.transaction('rw', database.sessions, async () => {
    let found: SessionRecord | null = null
    for (const session of await activeSessions(mode, database)) {
      if (!found && !isStale(session, now)) found = session
      else await database.sessions.put(closed(session, now))
    }
    return found
  })
}

/** Незавършените сесии от текущия учебен ден — само за четене (за живите заявки на екраните). */
export async function openSessions(now: number, database: AyeDb = db): Promise<SessionRecord[]> {
  const active = await database.sessions.where('status').equals('active').toArray()
  return active.filter((session) => !isStale(session, now))
}

/** Прескача картата на текущото място в опашката (елементът е махнат от съдържанието). */
export async function skipQueued(
  sessionId: string,
  now: number,
  database: AyeDb = db,
): Promise<SessionRecord | null> {
  return database.transaction('rw', database.sessions, async () => {
    const session = await database.sessions.get(sessionId)
    if (!session) return null
    const next = { ...session, position: session.position + 1, updatedAt: now }
    await database.sessions.put(next)
    return next
  })
}

/** Започва сесия. Друга активна сесия от същия вид се затваря. */
export async function startSession(
  mode: SessionMode,
  scope: SessionScope,
  queue: readonly string[],
  now: number,
  database: AyeDb = db,
): Promise<SessionRecord> {
  const session: SessionRecord = {
    id: newId(now),
    mode,
    status: 'active',
    startedAt: now,
    endedAt: null,
    updatedAt: now,
    scope,
    queue: [...queue],
    position: 0,
    stats: emptyStats(),
    undo: null,
  }
  await database.transaction('rw', database.sessions, async () => {
    for (const old of await activeSessions(mode, database)) {
      await database.sessions.put(closed(old, now))
    }
    await database.sessions.add(session)
  })
  return session
}

export async function finishSession(
  id: string,
  now: number,
  database: AyeDb = db,
): Promise<SessionRecord | null> {
  return database.transaction('rw', database.sessions, async () => {
    const session = await database.sessions.get(id)
    if (!session) return null
    const done: SessionRecord = {
      ...session,
      status: 'done',
      endedAt: now,
      undo: null,
      updatedAt: now,
    }
    await database.sessions.put(done)
    return done
  })
}

export type RateInput = {
  sessionId: string
  cardId: string
  rating: Rating
  now: number
  durationMs: number
  confidence?: Confidence
  /** Картата е от главната опашка (а не карта в учене). */
  fromQueue: boolean
}

/**
 * Оценка на карта в сесия: запис в дневника, ново състояние по FSRS (без него в cram),
 * следващото място в опашката и данни за undo.
 */
export async function rateInSession(
  input: RateInput,
  database: AyeDb = db,
): Promise<SessionRecord> {
  const { sessionId, cardId, rating, now, durationMs, confidence, fromQueue } = input
  return database.transaction(
    'rw',
    [database.cards, database.reviews, database.sessions],
    async () => {
      const session = await database.sessions.get(sessionId)
      if (!session || session.status !== 'active') throw new Error('Сесията вече е приключила.')
      const before = (await database.cards.get(cardId)) ?? null
      const cram = session.mode === 'cram'
      const review: ReviewRecord = {
        id: newId(now),
        cardId,
        at: now,
        rating,
        mode: cram ? 'cram' : 'srs',
        stateBefore: before?.state ?? 0,
        durationMs,
        sessionId,
        ...(confidence === undefined ? {} : { confidence }),
      }
      await database.reviews.add(review)
      if (!cram) await database.cards.put(rateCard(cardId, before, rating, now))

      const requeue = cram && rating === 1
      const next: SessionRecord = {
        ...session,
        queue: requeue ? requeueAfterAgain(session.queue, session.position, cardId) : session.queue,
        position: fromQueue ? session.position + 1 : session.position,
        stats: addRating(session.stats, rating),
        undo: {
          reviewId: review.id,
          cardId,
          before,
          position: session.position,
          ...(requeue ? { queue: session.queue } : {}),
        },
        updatedAt: now,
      }
      await database.sessions.put(next)
      return next
    },
  )
}

/** Отменя последната оценка в сесията: връща картата, опашката и статистиката. */
export async function undoLastRating(
  sessionId: string,
  now: number,
  database: AyeDb = db,
): Promise<SessionRecord | null> {
  return database.transaction(
    'rw',
    [database.cards, database.reviews, database.sessions],
    async () => {
      const session = await database.sessions.get(sessionId)
      if (!session?.undo) return session ?? null
      const { reviewId, cardId, before, position, queue } = session.undo
      const review = await database.reviews.get(reviewId)
      if (session.mode !== 'cram') {
        if (before) await database.cards.put(before)
        else await database.cards.delete(cardId)
      }
      await database.reviews.delete(reviewId)
      const next: SessionRecord = {
        ...session,
        queue: queue ?? session.queue,
        position,
        stats: review ? addRating(session.stats, review.rating, -1) : session.stats,
        undo: null,
        updatedAt: now,
      }
      await database.sessions.put(next)
      return next
    },
  )
}

// ——— Задачи и тетрадка на грешките ———

export type AttemptInput = {
  item: ContentItem
  response: Json
  result: EvalResult
  mode: AttemptMode
  at: number
  durationMs: number
  confidence?: Confidence
  sessionId?: string
  examId?: string
}

/** Записва отговор на задача и обновява тетрадката по части — в една транзакция. */
export async function recordAttempt(
  input: AttemptInput,
  database: AyeDb = db,
): Promise<AttemptRecord> {
  const { item, response, result, mode, at } = input
  const multiPart = result.parts.some((part) => part.key !== '')
  const attempt: AttemptRecord = {
    id: newId(at),
    itemId: item.id,
    at,
    mode,
    response,
    score: result.score,
    max: result.max,
    ...(multiPart
      ? { parts: result.parts.map(({ key, score, max }) => ({ key, score, max })) }
      : {}),
    durationMs: input.durationMs,
    ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
    ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
    ...(input.examId === undefined ? {} : { examId: input.examId }),
  }
  const outcomes = outcomesOf(item.id, result)
  await database.transaction('rw', [database.attempts, database.errors], async () => {
    await database.attempts.add(attempt)
    const existing = await database.errors.bulkGet(outcomes.map((outcome) => outcome.id))
    const updates = outcomes.flatMap((outcome, i) => {
      const next = applyOutcome(existing[i], outcome, { at, mode, response })
      return next ? [next] : []
    })
    if (updates.length > 0) await database.errors.bulkPut(updates)
  })
  return attempt
}

export function errorEntries(database: AyeDb = db): Promise<ErrorRecord[]> {
  return database.errors.toArray()
}

export function activeErrorCount(database: AyeDb = db): Promise<number> {
  return database.errors.where('status').equals('active').count()
}

// ——— За проверка ———

export async function saveCheck(
  itemId: string,
  status: CheckStatus,
  note: string,
  hash: string,
  now: number,
  database: AyeDb = db,
): Promise<CheckRecord> {
  const check: CheckRecord = {
    id: itemId,
    status,
    note: note.trim(),
    hash,
    at: now,
    updatedAt: now,
  }
  await database.checks.put(check)
  return check
}

export async function removeCheck(itemId: string, database: AyeDb = db): Promise<void> {
  await database.checks.delete(itemId)
}

export async function allChecks(database: AyeDb = db): Promise<Map<string, CheckRecord>> {
  const rows = await database.checks.toArray()
  return new Map(rows.map((row) => [row.id, row]))
}

// ——— Активност ———

/** Броят на действията (оценки и отговори) по учебни дни от момента `from` насам. */
export async function activityByDay(
  from: number,
  database: AyeDb = db,
): Promise<Map<string, number>> {
  const [reviews, attempts] = await Promise.all([
    database.reviews.where('at').aboveOrEqual(from).keys(),
    database.attempts.where('at').aboveOrEqual(from).keys(),
  ])
  const times = [...reviews, ...attempts].filter((key): key is number => typeof key === 'number')
  return countByDay(times)
}
