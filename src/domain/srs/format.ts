const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Интервалът до следващия преговор накратко, за бутоните за оценка: „< 1 мин“, „10 мин“,
 * „3 ч“, „1 ден“, „12 дни“, „2 месеца“, „1,5 години“. Мерните единици „мин“ и „ч“ се пишат
 * без точка.
 */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '< 1 мин'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} мин`
  if (ms < DAY) return `${Math.round(ms / HOUR)} ч`
  const days = Math.round(ms / DAY)
  if (days < 30) return plural(days, 'ден', 'дни')
  if (days < 365) return plural(Math.round(days / 30.44), 'месец', 'месеца')
  const years = Math.round((days / 365.25) * 10) / 10
  return Number.isInteger(years)
    ? plural(years, 'година', 'години')
    : `${String(years).replace('.', ',')} години`
}
