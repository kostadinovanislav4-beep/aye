/*
 * Учебният ден започва в 4:00 местно време (както в Anki). Така преговорът след полунощ
 * се брои към вечерта преди това — за дневните лимити, серията и правилото „различни дни“.
 * Денят се записва като 'YYYY-MM-DD'.
 */

export const DAY_START_HOUR = 4

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseDay(day: string): [number, number, number] {
  const match = DAY.exec(day)
  if (!match) throw new Error(`Невалиден ден „${day}“ — очаквам YYYY-MM-DD.`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Календарният ден на момента `at` по местно време — без правилото за 4:00. */
export function calendarDay(at: number): string {
  return formatDay(new Date(at))
}

/** Учебният ден на момента `at`. Между 0:00 и 4:00 е още предишният ден. */
export function studyDay(at: number): string {
  const date = new Date(at)
  if (date.getHours() < DAY_START_HOUR) date.setDate(date.getDate() - 1)
  return formatDay(date)
}

/** Денят след `n` дни (или преди, ако `n` е отрицателно). */
export function addDays(day: string, n: number): string {
  const [year, month, date] = parseDay(day)
  // По обед, за да не пречи смяната на лятното часово време.
  return formatDay(new Date(year, month - 1, date + n, 12))
}

/** Колко дни има от `from` до `to` (отрицателно, ако `to` е преди `from`). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parseDay(from)
  const [y2, m2, d2] = parseDay(to)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / MS_PER_DAY)
}

/** Кога започва учебният ден (4:00 местно време). */
export function studyDayStart(day: string): number {
  const [year, month, date] = parseDay(day)
  return new Date(year, month - 1, date, DAY_START_HOUR).getTime()
}

/** Кога започва следващият учебен ден след момента `at`. */
export function nextStudyDayStart(at: number): number {
  return studyDayStart(addDays(studyDay(at), 1))
}
