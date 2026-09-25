import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MODULE } from '../../app/modules'
import { useCatalog } from '../../app/useCatalog'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { primaryButton, quietButton, secondaryButton } from '../../components/styles'
import { openSessions, srsSnapshot } from '../../data/progress'
import { useSettings } from '../../data/settingsStore'
import { cardIdsOf, type CatalogDeck } from '../../domain/content/catalog'
import { scopeCardIds } from '../../domain/content/scope'
import type { SessionScope } from '../../domain/progress/types'
import { countCards, remainingToday, type CardCounts } from '../../domain/srs/overview'
import { plural } from '../../domain/text/format'
import { startCramSession, startSrsSession } from './start'

const EXAM_LABEL = { bel: 'БЕЛ', cae: 'CAE' } as const

function deckCardIds(deck: CatalogDeck): string[] {
  return deck.items.flatMap(cardIdsOf)
}

function CountsLine({ counts }: { counts: CardCounts }) {
  return (
    <p className="text-sm text-muted">
      {counts.due} за преговор · {counts.new} нови · {plural(counts.total, 'карта', 'карти')}
    </p>
  )
}

/** Флашкарти: преговорът за деня, колодите и cram (раздел 5.2 от SPEC). */
export default function FlashcardsPage() {
  const catalog = useCatalog()
  const snapshot = useLiveQuery(() => srsSnapshot(Date.now()), [])
  const open = useLiveQuery(() => openSessions(Date.now()), [])
  const limits = useSettings((state) => state.limits)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  if (!catalog || !snapshot) {
    return (
      <p role="status" className="py-16 text-center text-muted">
        Зареждане…
      </p>
    )
  }

  const decks = catalog.decks.filter((deck) => deckCardIds(deck).length > 0)
  const all = countCards(scopeCardIds(catalog, {}), snapshot.seen, snapshot.due)
  const today = remainingToday(all, limits, snapshot.done)
  const todayTotal = today.new + today.reviews + today.learning
  const resumable = (open ?? []).filter(
    (session) => session.mode === 'srs' || session.mode === 'cram',
  )

  const start = async (mode: 'srs' | 'cram', scope: SessionScope) => {
    if (starting) return
    setStarting(true)
    try {
      const now = Date.now()
      if (mode === 'srs') await startSrsSession(catalog, scope, limits, now)
      else await startCramSession(catalog, scope, now)
      void navigate(`/flashcards/session?mode=${mode}`)
    } finally {
      setStarting(false)
    }
  }

  return (
    <article className="space-y-6">
      <PageHeader icon={MODULE.flashcards.icon} title={MODULE.flashcards.title}>
        Разпределено повторение по FSRS
      </PageHeader>

      {resumable.map((session) => (
        <Panel key={session.id} className="border-accent bg-accent-soft">
          <p className="font-semibold">
            {session.mode === 'cram' ? 'Незавършен cram' : 'Незавършена сесия'}
          </p>
          <p className="mt-1 text-sm">
            {plural(session.stats.answered, 'оценка', 'оценки')} досега. Продължи оттам, където
            спря.
          </p>
          <Link to={`/flashcards/session?mode=${session.mode}`} className={`${primaryButton} mt-4`}>
            Продължи
          </Link>
        </Panel>
      ))}

      {decks.length === 0 ? (
        <Panel>
          <p className="text-muted">Още няма карти за преговор.</p>
        </Panel>
      ) : (
        <Panel title="Днес">
          {todayTotal > 0 ? (
            <p>
              {today.reviews} за преговор · {today.new} нови
              {today.learning > 0 ? ` · ${today.learning} в учене` : ''}
            </p>
          ) : (
            <p>Всичко за днес е преговорено.</p>
          )}
          <p className="mt-1 text-sm text-muted">
            Дневен лимит: {limits.newPerDay} нови и {limits.reviewsPerDay} преговора (Настройки).
          </p>
          <button
            type="button"
            onClick={() => void start('srs', {})}
            disabled={todayTotal === 0 || starting}
            className={`${primaryButton} mt-4`}
          >
            <Play aria-hidden className="size-4" />
            Започни преговора
          </button>
        </Panel>
      )}

      {decks.length > 0 && (
        <section aria-labelledby="decks-title" className="space-y-3">
          <h2 id="decks-title" className="text-lg font-semibold">
            Колоди
          </h2>
          <ul className="space-y-2">
            {decks.map((deck) => {
              const counts = countCards(deckCardIds(deck), snapshot.seen, snapshot.due)
              const scope: SessionScope = { decks: [deck.id] }
              // Дневните лимити са общи: когато са изпълнени, колодата няма какво да даде днес.
              const left = remainingToday(counts, limits, snapshot.done)
              const pending = left.new + left.reviews + left.learning > 0
              return (
                <li key={deck.id} className="rounded-3xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
                      {EXAM_LABEL[deck.exam]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{deck.title}</p>
                      <CountsLine counts={counts} />
                      {!pending && counts.new > 0 && (
                        <p className="text-sm text-muted">
                          Днешният лимит за нови карти е изпълнен.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void start('srs', scope)}
                      disabled={!pending || starting}
                      className={secondaryButton}
                    >
                      Учи
                    </button>
                    <button
                      type="button"
                      onClick={() => void start('cram', scope)}
                      disabled={starting}
                      className={quietButton}
                    >
                      <Zap aria-hidden className="size-4" />
                      Cram
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="text-sm text-muted">
            Cram преговаря всички карти от колодата без график — първо най-слабо помнените. Оценките
            в него не местят следващите преговори.
          </p>
        </section>
      )}
    </article>
  )
}
