import { addDays, studyDay } from '../time/studyDay'

/*
 * Серия и топлинна карта (раздел 5.1 от SPEC). Активност е всяка оценка на карта и всеки
 * отговор на задача; денят е учебният (от 4:00 до 4:00).
 */

/** Броят на действията по учебни дни. */
export function countByDay(times: Iterable<number>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const at of times) {
    const day = studyDay(at)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
}

/**
 * Поредните дни с учене до днес. Ако днес още няма учене, серията не е прекъсната —
 * брои се до вчера.
 */
export function currentStreak(days: ReadonlyMap<string, number>, today: string): number {
  const active = (day: string) => (days.get(day) ?? 0) > 0
  let day = active(today) ? today : addDays(today, -1)
  let streak = 0
  while (active(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

export type HeatmapDay = { day: string; count: number }

/**
 * Последните `weeks` седмици по колони от понеделник до неделя, като последната колона е
 * текущата седмица. Дните след днес са null.
 */
export function heatmapWeeks(
  days: ReadonlyMap<string, number>,
  today: string,
  weeks: number,
): (HeatmapDay | null)[][] {
  const [year = 0, month = 1, date = 1] = today.split('-').map(Number)
  // 0 — понеделник … 6 — неделя.
  const weekday = (new Date(year, month - 1, date, 12).getDay() + 6) % 7
  const start = addDays(today, -weekday - 7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, w * 7 + d)
      return day > today ? null : { day, count: days.get(day) ?? 0 }
    }),
  )
}
