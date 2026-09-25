/*
 * id в прогреса. Картите и частите на задачите се пишат като `<id на елемента>#<част>`:
 * `#c2` — изтриване 2 в cloze, `#g3` — празно място 3, `#q2` — въпрос 2, `#e1` — грешка 1
 * при редактиране. id на елементите имат само малки латински букви, цифри и тирета,
 * затова `#` не може да се обърка с тях.
 */

export const PART_SEPARATOR = '#'

/** id на карта или на част от задача. Празна част означава целия елемент. */
export function targetId(itemId: string, part = ''): string {
  return part ? `${itemId}${PART_SEPARATOR}${part}` : itemId
}

/** Картата за изтриване N в cloze. */
export function clozeCardId(itemId: string, deletion: number): string {
  return targetId(itemId, `c${deletion}`)
}

export function splitTargetId(id: string): { itemId: string; part: string } {
  const at = id.indexOf(PART_SEPARATOR)
  return at < 0 ? { itemId: id, part: '' } : { itemId: id.slice(0, at), part: id.slice(at + 1) }
}

export function itemIdOf(id: string): string {
  return splitTargetId(id).itemId
}

/**
 * Нов уникален id за редовете в дневниците и сесиите: времето (за подредба) и 64 случайни бита.
 * Не ползва crypto.randomUUID, защото той липсва извън HTTPS (напр. `npm run dev:host`).
 */
export function newId(now: number = Date.now()): string {
  const random = crypto.getRandomValues(new Uint32Array(2))
  const tail = Array.from(random, (n) => n.toString(36).padStart(7, '0')).join('')
  return `${now.toString(36).padStart(9, '0')}-${tail}`
}
