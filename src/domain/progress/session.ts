import { studyDay } from '../time/studyDay'
import type { Rating, SessionRecord, SessionStats } from './types'

export function emptyStats(): SessionStats {
  return { answered: 0, correct: 0, ratings: [0, 0, 0, 0] }
}

/** Статистиката след оценка. „Отново“ е грешен отговор, другите три — верен. */
export function addRating(stats: SessionStats, rating: Rating, sign: 1 | -1 = 1): SessionStats {
  const ratings: SessionStats['ratings'] = [...stats.ratings]
  ratings[rating - 1] = Math.max(0, (ratings[rating - 1] ?? 0) + sign)
  return {
    answered: Math.max(0, stats.answered + sign),
    correct: Math.max(0, stats.correct + (rating > 1 ? sign : 0)),
    ratings,
  }
}

/** Незавършена сесия от минал учебен ден не се възстановява — днес опашката е друга. */
export function isStale(session: Pick<SessionRecord, 'startedAt'>, now: number): boolean {
  return studyDay(session.startedAt) !== studyDay(now)
}
