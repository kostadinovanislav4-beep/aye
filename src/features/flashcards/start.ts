import { doneToday, getCards, startSession } from '../../data/progress'
import type { Catalog } from '../../domain/content/catalog'
import { scopeCardIds } from '../../domain/content/scope'
import type { SessionRecord, SessionScope } from '../../domain/progress/types'
import type { DailyLimitsSetting } from '../../domain/settings/settings'
import { retrievability } from '../../domain/srs/fsrs'
import { buildCramQueue, buildDailyQueue } from '../../domain/srs/queue'

/** Сесия по графика: преговорите и новите карти за деня в рамките на лимитите. */
export async function startSrsSession(
  catalog: Catalog,
  scope: SessionScope,
  limits: DailyLimitsSetting,
  now: number,
): Promise<SessionRecord> {
  const cardIds = scopeCardIds(catalog, scope)
  const [records, done] = await Promise.all([getCards(cardIds), doneToday(now)])
  const queue = buildDailyQueue({ now, cardIds, records, limits, done })
  return startSession('srs', scope, queue, now)
}

/** Cram: всички карти в обхвата без график, първо най-слабо помнените. */
export async function startCramSession(
  catalog: Catalog,
  scope: SessionScope,
  now: number,
): Promise<SessionRecord> {
  const cardIds = scopeCardIds(catalog, scope)
  const records = await getCards(cardIds)
  const queue = buildCramQueue(cardIds, (id) => {
    const record = records.get(id)
    return record ? retrievability(record, now) : null
  })
  return startSession('cram', scope, queue, now)
}
