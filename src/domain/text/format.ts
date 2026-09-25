/*
 * Дати, часове и бройки на български за интерфейса. Написани са ръчно, за да не зависят
 * от данните за езика в браузъра.
 */

const MONTHS = [
  'януари',
  'февруари',
  'март',
  'април',
  'май',
  'юни',
  'юли',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
] as const

/** „1 ден“, „5 дни“ и т.н. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** „19 май 2027 г.“ */
export function formatDate(at: number): string {
  const date = new Date(at)
  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? ''} ${date.getFullYear()} г.`
}

/** „08:30 ч.“ */
export function formatTime(at: number): string {
  const date = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ч.`
}

/** До изпита: „днес“, „утре“, „след 236 дни“ или „мина“. */
export function countdownLabel(days: number): string {
  if (days < 0) return 'мина'
  if (days === 0) return 'днес'
  if (days === 1) return 'утре'
  return `след ${plural(days, 'ден', 'дни')}`
}
