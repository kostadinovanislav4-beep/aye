import type { CardRecord, ReviewRecord } from '../progress/types'
import { nextStudyDayStart, studyDay, studyDayStart } from '../time/studyDay'

/*
 * Опашката на сесията с флашкарти. Главната опашка се сглобява веднъж — в началото на
 * сесията — и се пази в `sessions`, за да се възстанови след затваряне. Картите в учене
 * (стъпки от минути) не са в нея: те се показват, когато им дойде времето.
 */

export type DailyLimits = { newPerDay: number; reviewsPerDay: number }

export type DoneToday = { newDone: number; reviewsDone: number }

/** Картите в учене се показват до 20 минути по-рано, когато няма друго (както в Anki). */
export const LEARN_AHEAD_MS = 20 * 60_000

/** В cram сгрешената карта се връща след толкова други карти. */
export const CRAM_AGAIN_GAP = 5

const isNew = (record: CardRecord | undefined) => !record || record.state === 0
const isLearning = (record: CardRecord) => record.state === 1 || record.state === 3

/** Колко нови карти и преговори са минати в текущия учебен ден (оценките в cram не се броят). */
export function countDoneToday(
  reviews: readonly Pick<ReviewRecord, 'at' | 'mode' | 'stateBefore'>[],
  now: number,
): DoneToday {
  const from = studyDayStart(studyDay(now))
  let newDone = 0
  let reviewsDone = 0
  for (const review of reviews) {
    if (review.mode !== 'srs' || review.at < from || review.at > now) continue
    if (review.stateBefore === 0) newDone += 1
    else if (review.stateBefore === 2) reviewsDone += 1
  }
  return { newDone, reviewsDone }
}

/**
 * Разпределя новите карти равномерно между преговорите, без да сменя реда вътре във
 * всяка от двете групи.
 */
export function interleave(reviews: readonly string[], news: readonly string[]): string[] {
  const total = reviews.length + news.length
  const result: string[] = []
  let r = 0
  let n = 0
  for (let i = 0; i < total; i += 1) {
    const wantNew = Math.floor(((i + 1) * news.length) / total) > n
    const next = (wantNew || r >= reviews.length) && n < news.length ? news[n++] : reviews[r++]
    if (next !== undefined) result.push(next)
  }
  return result
}

export type QueueInput = {
  now: number
  /** Картите в обхвата на сесията по реда в съдържанието. */
  cardIds: readonly string[]
  records: ReadonlyMap<string, CardRecord>
  limits: DailyLimits
  done: DoneToday
}

/**
 * Главната опашка за деня: преговорите с падеж до края на учебния ден (първо най-старите)
 * и новите карти по реда в съдържанието, в рамките на дневните лимити.
 */
export function buildDailyQueue({ now, cardIds, records, limits, done }: QueueInput): string[] {
  const dayEnd = nextStudyDayStart(now)
  const reviews: CardRecord[] = []
  const news: string[] = []
  for (const id of cardIds) {
    const record = records.get(id)
    if (isNew(record)) news.push(id)
    else if (record && record.state === 2 && record.due < dayEnd) reviews.push(record)
  }
  // sort е стабилен, затова при равен падеж остава редът от съдържанието.
  reviews.sort((a, b) => a.due - b.due)
  const reviewSlots = Math.max(0, limits.reviewsPerDay - done.reviewsDone)
  const newSlots = Math.max(0, limits.newPerDay - done.newDone)
  return interleave(
    reviews.slice(0, reviewSlots).map((record) => record.id),
    news.slice(0, newSlots),
  )
}

export type LearningCard = { id: string; due: number }

/** Картите в учене с падеж до края на учебния ден, първо най-ранните. */
export function learningDue(
  cardIds: readonly string[],
  records: ReadonlyMap<string, CardRecord>,
  now: number,
): LearningCard[] {
  const dayEnd = nextStudyDayStart(now)
  const result: LearningCard[] = []
  for (const id of cardIds) {
    const record = records.get(id)
    if (record && isLearning(record) && record.due < dayEnd) result.push({ id, due: record.due })
  }
  return result.sort((a, b) => a.due - b.due)
}

export type NextStep =
  | { kind: 'card'; id: string; fromQueue: boolean }
  | { kind: 'wait'; until: number }
  | { kind: 'done' }

/**
 * Коя карта е следващата: първо картите в учене, на които е дошло времето; после главната
 * опашка; накрая картите в учене до 20 минути напред. Ако остават само по-късни карти в
 * учене — чакане.
 */
export function nextStep({
  now,
  queue,
  position,
  learning,
}: {
  now: number
  queue: readonly string[]
  position: number
  learning: readonly LearningCard[]
}): NextStep {
  const first = learning.reduce<LearningCard | undefined>(
    (best, card) => (!best || card.due < best.due ? card : best),
    undefined,
  )
  if (first && first.due <= now) return { kind: 'card', id: first.id, fromQueue: false }
  const queued = queue[position]
  if (queued !== undefined) return { kind: 'card', id: queued, fromQueue: true }
  if (first && first.due <= now + LEARN_AHEAD_MS) {
    return { kind: 'card', id: first.id, fromQueue: false }
  }
  if (first) return { kind: 'wait', until: first.due }
  return { kind: 'done' }
}

/**
 * Опашката за cram (без график): първо картите, които се помнят най-слабо, после новите.
 * `strength` дава вероятността картата да се помни (0–1) или null за нова карта.
 */
export function buildCramQueue(
  cardIds: readonly string[],
  strength: (id: string) => number | null,
): string[] {
  const seen: { id: string; value: number }[] = []
  const news: string[] = []
  for (const id of cardIds) {
    const value = strength(id)
    if (value === null) news.push(id)
    else seen.push({ id, value })
  }
  seen.sort((a, b) => a.value - b.value)
  return [...seen.map((card) => card.id), ...news]
}

/** В cram сгрешената карта се връща в опашката няколко карти по-късно. */
export function requeueAfterAgain(
  queue: readonly string[],
  position: number,
  id: string,
): string[] {
  const at = Math.min(queue.length, position + 1 + CRAM_AGAIN_GAP)
  return [...queue.slice(0, at), id, ...queue.slice(at)]
}
