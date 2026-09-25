import type { CardRecord } from '../progress/types'
import type { DailyLimits, DoneToday } from './queue'

/** Картите в една колода (или в целия обхват) към момента. */
export type CardCounts = {
  total: number
  /** Още невиждани. */
  new: number
  /** За преговор до края на учебния ден. */
  due: number
  /** В учене (стъпки от минути) до края на учебния ден. */
  learning: number
}

/**
 * Брои картите. `seen` са картите с ред в базата, `due` — редовете с падеж до края на
 * учебния ден.
 */
export function countCards(
  cardIds: readonly string[],
  seen: ReadonlySet<string>,
  due: ReadonlyMap<string, CardRecord>,
): CardCounts {
  const counts: CardCounts = { total: cardIds.length, new: 0, due: 0, learning: 0 }
  for (const id of cardIds) {
    if (!seen.has(id)) {
      counts.new += 1
      continue
    }
    const record = due.get(id)
    if (!record) continue
    if (record.state === 2) counts.due += 1
    else if (record.state === 1 || record.state === 3) counts.learning += 1
  }
  return counts
}

/** Колко остават за днес в рамките на дневните лимити. */
export function remainingToday(
  counts: CardCounts,
  limits: DailyLimits,
  done: DoneToday,
): { new: number; reviews: number; learning: number } {
  return {
    new: Math.max(0, Math.min(counts.new, limits.newPerDay - done.newDone)),
    reviews: Math.max(0, Math.min(counts.due, limits.reviewsPerDay - done.reviewsDone)),
    learning: counts.learning,
  }
}
