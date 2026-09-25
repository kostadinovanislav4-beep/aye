import type { EvalResult } from '../eval/types'
import { targetId } from '../progress/ids'
import type { AttemptMode, ErrorRecord, Json } from '../progress/types'
import { daysBetween, studyDay } from '../time/studyDay'

/*
 * Тетрадката на грешките (раздел 5.7 от SPEC). Пази грешките по части на задачите.
 * Всяка грешка от практиката и симулациите влиза автоматично. Записът е „усвоен“ след
 * 3 поредни верни отговора в различни учебни дни; нова грешка го връща в активните.
 */

export const MASTERY_STREAK = 3

/** Резултатът за една част: `<id>` или `<id>#g3`, `#q2`, `#e1`, `#c1`. */
export type Outcome = { id: string; itemId: string; correct: boolean }

/** Частите от оценката като резултати за тетрадката. Самооценката (писане, говорене) не влиза. */
export function outcomesOf(itemId: string, result: EvalResult): Outcome[] {
  if (result.selfAssessed) return []
  return result.parts.map((part) => ({
    id: targetId(itemId, part.key),
    itemId,
    correct: part.correct,
  }))
}

export type OutcomeContext = { at: number; mode: AttemptMode; response: Json }

/**
 * Записът след отговора или null, ако няма какво да се запише: верен отговор без запис или
 * втори верен отговор в същия учебен ден (серията брои различни дни).
 */
export function applyOutcome(
  entry: ErrorRecord | undefined,
  outcome: Outcome,
  { at, mode, response }: OutcomeContext,
): ErrorRecord | null {
  if (!outcome.correct) {
    return {
      id: outcome.id,
      itemId: outcome.itemId,
      status: 'active',
      wrongCount: (entry?.wrongCount ?? 0) + 1,
      streak: 0,
      firstWrongAt: entry?.firstWrongAt ?? at,
      lastWrongAt: at,
      lastRightAt: entry?.lastRightAt ?? null,
      masteredAt: null,
      lastMode: mode,
      lastResponse: response,
      updatedAt: at,
    }
  }
  if (!entry || entry.status === 'mastered') return null
  // Първият верен отговор след грешка се брои винаги; следващите — само в нов учебен ден.
  const newDay = entry.lastRightAt === null || studyDay(entry.lastRightAt) !== studyDay(at)
  if (entry.streak > 0 && !newDay) return null
  const streak = entry.streak + 1
  const mastered = streak >= MASTERY_STREAK
  return {
    ...entry,
    streak,
    lastRightAt: at,
    status: mastered ? 'mastered' : 'active',
    masteredAt: mastered ? at : null,
    updatedAt: at,
  }
}

/** Отговорено ли е вярно днес — тогава записът чака следващия учебен ден. */
function answeredToday(entry: ErrorRecord, now: number): boolean {
  return (
    entry.streak > 0 && entry.lastRightAt !== null && studyDay(entry.lastRightAt) === studyDay(now)
  )
}

/** Колкото по-често е грешено и колкото по-отдавна не е упражнявано, толкова по-напред. */
export function priority(entry: ErrorRecord, now: number): number {
  const lastSeen = Math.max(entry.lastWrongAt, entry.lastRightAt ?? 0)
  const idleDays = Math.max(0, daysBetween(studyDay(lastSeen), studyDay(now)))
  return entry.wrongCount + idleDays / 7
}

/** Активните записи за „Преговор на грешките“, подредени по приоритет. */
export function reviewOrder(entries: readonly ErrorRecord[], now: number): ErrorRecord[] {
  return entries
    .filter((entry) => entry.status === 'active' && !answeredToday(entry, now))
    .map((entry) => ({ entry, score: priority(entry, now) }))
    .sort((a, b) => b.score - a.score || b.entry.lastWrongAt - a.entry.lastWrongAt)
    .map(({ entry }) => entry)
}

/** Колко грешки има по тагове — за графиката „по кои тагове греша“. */
export function countByTag(
  entries: readonly ErrorRecord[],
  tagsOf: (entry: ErrorRecord) => readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const tag of tagsOf(entry)) counts.set(tag, (counts.get(tag) ?? 0) + entry.wrongCount)
  }
  return counts
}
