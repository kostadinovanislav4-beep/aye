import { heatmapWeeks } from '../../domain/progress/activity'
import { formatDate } from '../../domain/text/format'
import { studyDayStart } from '../../domain/time/studyDay'

const LEVELS = ['bg-surface-2', 'bg-accent/35', 'bg-accent/60', 'bg-accent/85', 'bg-accent-strong']

/** Нивото на цвета по броя на действията за деня. */
function level(count: number): number {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 30) return 2
  if (count < 60) return 3
  return 4
}

/** Топлинна карта на ученето: колони по седмици, от понеделник до неделя. */
export function Heatmap({
  days,
  today,
  weeks = 12,
}: {
  days: ReadonlyMap<string, number>
  today: string
  weeks?: number
}) {
  const grid = heatmapWeeks(days, today, weeks)
  const cells = grid.flat().filter((cell) => cell !== null)
  const active = cells.filter((cell) => cell.count > 0).length
  return (
    <div
      role="img"
      aria-label={`Учене в ${active} от последните ${cells.length} дни`}
      className="flex gap-1"
    >
      {grid.map((week, w) => (
        <div key={w} className="grid grid-rows-7 gap-1">
          {week.map((cell, d) =>
            cell ? (
              <span
                key={d}
                title={`${formatDate(studyDayStart(cell.day))}: ${cell.count}`}
                className={`size-3.5 rounded-[4px] ${LEVELS[level(cell.count)] ?? ''}`}
              />
            ) : (
              <span key={d} className="size-3.5" />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
