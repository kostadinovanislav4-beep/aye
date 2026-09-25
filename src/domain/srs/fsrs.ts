import { createEmptyCard, fsrs, generatorParameters, type Card } from 'ts-fsrs'
import type { CardRecord, CardState, Rating, ReviewRecord } from '../progress/types'

/*
 * Връзката с алгоритъма FSRS (ts-fsrs). Навън излизат само редове от таблицата `cards`:
 * времената са в милисекунди, а полетата — в camelCase.
 */

/** Целево задържане 90 %, леко разсейване на интервалите, стъпки при учене 1 и 10 минути. */
export const FSRS_PARAMS = generatorParameters({
  request_retention: 0.9,
  enable_fuzz: true,
  enable_short_term: true,
})

const scheduler = fsrs(FSRS_PARAMS)

export const RATINGS: readonly Rating[] = [1, 2, 3, 4]

function toCardState(value: number): CardState {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  throw new Error(`Непознато състояние на карта: ${value}.`)
}

/** Картата във вида на ts-fsrs. Без ред — нова карта. */
export function toFsrsCard(record: CardRecord | null, now: number): Card {
  if (!record) return createEmptyCard(new Date(now))
  return {
    due: new Date(record.due),
    stability: record.stability,
    difficulty: record.difficulty,
    // Остаряло поле в ts-fsrs 5: алгоритъмът смята дните от last_review.
    elapsed_days: 0,
    scheduled_days: record.scheduledDays,
    learning_steps: record.learningSteps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state,
    ...(record.lastReview === null ? {} : { last_review: new Date(record.lastReview) }),
  }
}

export function fromFsrsCard(id: string, card: Card, updatedAt: number): CardRecord {
  return {
    id,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: toCardState(card.state),
    lastReview: card.last_review ? card.last_review.getTime() : null,
    updatedAt,
  }
}

/** Новото състояние на картата след оценка. `record` е null за нова карта. */
export function rateCard(
  id: string,
  record: CardRecord | null,
  rating: Rating,
  now: number,
): CardRecord {
  const { card } = scheduler.next(toFsrsCard(record, now), new Date(now), rating)
  return fromFsrsCard(id, card, now)
}

/** Кога ще е следващият преговор при всяка оценка — за надписите на бутоните. */
export function previewDue(record: CardRecord | null, now: number): Record<Rating, number> {
  const preview = scheduler.repeat(toFsrsCard(record, now), new Date(now))
  return {
    1: preview[1].card.due.getTime(),
    2: preview[2].card.due.getTime(),
    3: preview[3].card.due.getTime(),
    4: preview[4].card.due.getTime(),
  }
}

/** Вероятността картата да се помни в момента `now` (от 0 до 1). Новата карта е 0. */
export function retrievability(record: CardRecord | null, now: number): number {
  if (!record || record.state === 0) return 0
  return scheduler.get_retrievability(toFsrsCard(record, now), new Date(now), false)
}

/**
 * Преизчислява картата от историята ѝ (при импорт от друго устройство).
 * Оценките в режим cram не местят графика и се пропускат. Без оценки — null.
 */
export function replayCard(
  id: string,
  reviews: readonly Pick<ReviewRecord, 'at' | 'rating' | 'mode'>[],
): CardRecord | null {
  const history = reviews.filter((review) => review.mode === 'srs').sort((a, b) => a.at - b.at)
  let record: CardRecord | null = null
  for (const review of history) record = rateCard(id, record, review.rating, review.at)
  return record
}
