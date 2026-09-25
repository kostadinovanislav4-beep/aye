import { useLiveQuery } from 'dexie-react-hooks'
import { Play } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MODULE } from '../../app/modules'
import { useCatalog } from '../../app/useCatalog'
import { useNow } from '../../app/useNow'
import { Panel } from '../../components/Panel'
import { panel, primaryButton, secondaryButton } from '../../components/styles'
import { activeErrorCount, activityByDay, allChecks, srsSnapshot } from '../../data/progress'
import { useSettings } from '../../data/settingsStore'
import { scopeCardIds } from '../../domain/content/scope'
import { currentStreak } from '../../domain/progress/activity'
import { examTime } from '../../domain/settings/settings'
import { countCards, remainingToday } from '../../domain/srs/overview'
import { countdownLabel, formatDate, formatTime, plural } from '../../domain/text/format'
import { calendarDay, daysBetween, studyDay } from '../../domain/time/studyDay'
import { startSrsSession } from '../flashcards/start'
import { Heatmap } from './Heatmap'
import { InstallHint } from './InstallHint'

const DAY = 24 * 60 * 60 * 1000
const HEATMAP_WEEKS = 12
const BACKUP_EVERY_DAYS = 7

function Countdown({ label, date, now }: { label: string; date: string | null; now: number }) {
  const at = examTime(date)
  return (
    <div className={panel}>
      <p className="text-sm text-muted">{label}</p>
      {at === null ? (
        <>
          <p className="mt-1 text-lg font-semibold">Няма дата</p>
          <Link to="/settings" className="text-sm font-medium text-accent-strong underline">
            Въведи я в Настройки
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold">
            {countdownLabel(daysBetween(calendarDay(now), calendarDay(at)))}
          </p>
          <p className="text-sm text-muted">
            {formatDate(at)}, {formatTime(at)}
          </p>
        </>
      )}
    </div>
  )
}

/** Бързите бутони от раздел 5.1 на SPEC. */
const QUICK = [
  { module: MODULE.flashcards, label: 'Флашкарти' },
  { module: MODULE.practice, label: 'Практика' },
  { module: MODULE.exam, label: 'Симулация' },
  { module: MODULE.writing, label: 'Писане' },
]

/** Таблото (раздел 5.1 от SPEC) в базов вид. */
export default function DashboardPage() {
  const catalog = useCatalog()
  const snapshot = useLiveQuery(() => srsSnapshot(Date.now()), [])
  const activity = useLiveQuery(() => activityByDay(Date.now() - (HEATMAP_WEEKS * 7 + 1) * DAY), [])
  const checks = useLiveQuery(() => allChecks(), [])
  const errors = useLiveQuery(() => activeErrorCount(), [])
  const examDates = useSettings((state) => state.examDates)
  const limits = useSettings((state) => state.limits)
  const lastBackupAt = useSettings((state) => state.lastBackupAt)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const now = useNow()

  const today = studyDay(now)
  const counts =
    catalog && snapshot ? countCards(scopeCardIds(catalog, {}), snapshot.seen, snapshot.due) : null
  const left = counts && snapshot ? remainingToday(counts, limits, snapshot.done) : null
  const leftTotal = left ? left.new + left.reviews + left.learning : 0
  const streak = activity ? currentStreak(activity, today) : 0
  const hasProgress = (snapshot?.seen.size ?? 0) > 0 || (activity?.size ?? 0) > 0
  const needsBackup =
    hasProgress && (lastBackupAt === null || now - lastBackupAt > BACKUP_EVERY_DAYS * DAY)
  const toCheck =
    catalog && checks
      ? catalog.decks
          .flatMap((deck) => deck.items)
          .filter((item) => !item.verified && checks.get(item.id)?.hash !== item.hash).length
      : 0

  const start = async () => {
    if (!catalog || starting) return
    setStarting(true)
    try {
      await startSrsSession(catalog, {}, limits, Date.now())
      void navigate('/flashcards/session?mode=srs')
    } finally {
      setStarting(false)
    }
  }

  return (
    <article className="space-y-6">
      <InstallHint />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Табло</h1>
        <p className="mt-0.5 text-sm text-muted">{formatDate(now)}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Countdown label="ДЗИ по БЕЛ" date={examDates.bel} now={now} />
        <Countdown label="C1 Advanced" date={examDates.cae} now={now} />
      </div>

      <Panel title="Днес">
        {left && counts && counts.total > 0 ? (
          <>
            <p>
              {leftTotal > 0
                ? `${left.reviews} за преговор · ${left.new} нови${left.learning > 0 ? ` · ${left.learning} в учене` : ''}`
                : 'Всичко за днес е преговорено.'}
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={leftTotal === 0 || starting}
              className={`${primaryButton} mt-4`}
            >
              <Play aria-hidden className="size-4" />
              Започни преговора
            </button>
          </>
        ) : (
          <p className="text-muted">Още няма карти за преговор.</p>
        )}
      </Panel>

      <Panel
        title="Активност"
        action={
          <span className="text-sm font-medium text-accent-strong">
            Серия: {plural(streak, 'ден', 'дни')}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <Heatmap days={activity ?? new Map()} today={today} weeks={HEATMAP_WEEKS} />
        </div>
      </Panel>

      {needsBackup && (
        <Panel className="border-accent bg-accent-soft">
          <p className="font-semibold">Време е за бекъп</p>
          <p className="mt-1 text-sm">
            {lastBackupAt
              ? `Последният бекъп е от ${formatDate(lastBackupAt)}.`
              : 'Още няма бекъп.'}{' '}
            Данните са само на това устройство.
          </p>
          <Link to="/settings#backup" className={`${secondaryButton} mt-3`}>
            Направи бекъп
          </Link>
        </Panel>
      )}

      {(toCheck > 0 || (errors ?? 0) > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {toCheck > 0 && (
            <Link to={MODULE.review.path} className={`${panel} block hover:bg-surface-2`}>
              <p className="text-sm text-muted">{MODULE.review.title}</p>
              <p className="mt-1 text-lg font-semibold">{plural(toCheck, 'елемент', 'елемента')}</p>
            </Link>
          )}
          {(errors ?? 0) > 0 && (
            <Link to={MODULE.errors.path} className={`${panel} block hover:bg-surface-2`}>
              <p className="text-sm text-muted">{MODULE.errors.title}</p>
              <p className="mt-1 text-lg font-semibold">
                {plural(errors ?? 0, 'активна грешка', 'активни грешки')}
              </p>
            </Link>
          )}
        </div>
      )}

      <nav aria-label="Бързи връзки" className="grid grid-cols-2 gap-3">
        {QUICK.map(({ module: { id, path, icon: Icon }, label }) => (
          <Link
            key={id}
            to={path}
            className={`${panel} flex min-h-20 items-center gap-3 font-semibold hover:bg-surface-2`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
              <Icon aria-hidden className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </article>
  )
}
