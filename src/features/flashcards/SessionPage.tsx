import { Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { iconButton, primaryButton, quietButton, secondaryButton } from '../../components/styles'
import { useSettings } from '../../data/settingsStore'
import type { Confidence, Rating, SessionRecord } from '../../domain/progress/types'
import { formatInterval } from '../../domain/srs/format'
import { RATINGS, previewDue } from '../../domain/srs/fsrs'
import { formatTime, plural } from '../../domain/text/format'
import { CardFace } from './CardFace'
import { useFlashcardSession, type SessionView } from './useFlashcardSession'

const RATING_LABEL: Record<Rating, string> = { 1: 'Отново', 2: 'Трудно', 3: 'Добре', 4: 'Лесно' }

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  1: 'Налучквам',
  2: 'Може би',
  3: 'Вероятно',
  4: 'Сигурно',
}

const CONFIDENCES: readonly Confidence[] = [1, 2, 3, 4]

/** Клавишите 1–4, интервалът и Enter не пречат на писане в поле и на фокусиран бутон. */
function ignoreKey(event: KeyboardEvent): boolean {
  const target = event.target
  if (event.metaKey || event.ctrlKey || event.altKey) return true
  if (!(target instanceof HTMLElement)) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return target.tagName === 'BUTTON' && (event.key === ' ' || event.key === 'Enter')
}

const digit = (key: string) => (['1', '2', '3', '4'].includes(key) ? Number(key) : null)

type CardView = Extract<SessionView, { kind: 'card' }>

/** Една карта: лице, после гръб и бутоните за оценка в долната част на екрана. */
function CardStage({
  view,
  cram,
  onRate,
}: {
  view: CardView
  cram: boolean
  onRate: (rating: Rating, confidence?: Confidence) => void
}) {
  const askConfidence = useSettings((state) => state.askConfidence)
  const voice = useSettings((state) => state.ttsVoice)
  const [revealed, setRevealed] = useState(false)
  const [confidence, setConfidence] = useState<Confidence>()
  const [now] = useState(() => Date.now())
  const due = useMemo(() => (cram ? null : previewDue(view.record, now)), [cram, view.record, now])

  const reveal = useCallback((level?: Confidence) => {
    if (level) setConfidence(level)
    setRevealed(true)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (ignoreKey(event)) return
      const n = digit(event.key)
      const space = event.key === ' ' || event.key === 'Enter'
      if (!revealed) {
        if (askConfidence && n) reveal(n as Confidence)
        else if (!askConfidence && space) reveal()
        else return
      } else if (n) onRate(n as Rating, confidence)
      else if (space) onRate(3, confidence)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, askConfidence, confidence, onRate, reveal])

  return (
    <>
      <article
        aria-live="polite"
        className="rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8"
      >
        {!view.item.verified && (
          <p className="mb-4 inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
            Непроверено
          </p>
        )}
        <CardFace item={view.item} cardId={view.cardId} revealed={revealed} voice={voice} />
      </article>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur md:left-72">
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-3 md:px-8">
          {!revealed && askConfidence && (
            <>
              <p className="mb-2 text-center text-sm text-muted">Каква е увереността ти?</p>
              <div className="grid grid-cols-4 gap-2">
                {CONFIDENCES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => reveal(level)}
                    className="min-h-14 rounded-2xl border border-border bg-surface px-1 text-sm font-medium hover:bg-surface-2"
                  >
                    {CONFIDENCE_LABEL[level]}
                  </button>
                ))}
              </div>
            </>
          )}
          {!revealed && !askConfidence && (
            <button type="button" onClick={() => reveal()} className={`${primaryButton} w-full`}>
              Покажи отговора
            </button>
          )}
          {revealed && (
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onRate(rating, confidence)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 ${
                    rating === 3
                      ? 'bg-accent font-semibold text-on-accent'
                      : 'border border-border bg-surface font-medium hover:bg-surface-2'
                  }`}
                >
                  <span>{RATING_LABEL[rating]}</span>
                  {due && (
                    <span className="text-xs font-normal opacity-80">
                      {formatInterval(due[rating] - now)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Summary({ session }: { session: SessionRecord }) {
  const { answered, correct, ratings } = session.stats
  const share = answered > 0 ? Math.round((correct / answered) * 100) : 0
  return (
    <section className="rounded-3xl border border-border bg-surface p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {answered > 0 ? 'Сесията приключи' : 'Няма карти за сега'}
      </h1>
      {answered > 0 ? (
        <>
          <p className="mt-2 text-muted">
            {plural(answered, 'оценка', 'оценки')} · {share} % без „Отново“
          </p>
          <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
            {RATINGS.map((rating) => (
              <div key={rating} className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">{RATING_LABEL[rating]}</dt>
                <dd className="text-xl font-semibold">{ratings[rating - 1]}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="mt-2 text-muted">Всичко за днес е преговорено.</p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/flashcards" className={primaryButton}>
          Към флашкартите
        </Link>
        <Link to="/" className={secondaryButton}>
          Към таблото
        </Link>
      </div>
    </section>
  )
}

/** Сесия с флашкарти (раздел 5.2 от SPEC). Възстановява се след затваряне в същия ден. */
export default function SessionPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'cram' ? 'cram' : 'srs'
  const navigate = useNavigate()
  const { view, rate, undo, finish, showNow, canUndo } = useFlashcardSession(mode)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const undoKey =
        (event.key === 'z' || event.key === 'Z') &&
        !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      if (undoKey && canUndo) {
        event.preventDefault()
        void undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canUndo, undo])

  if (view.kind === 'loading') {
    return (
      <p role="status" className="py-16 text-center text-muted">
        Зареждане…
      </p>
    )
  }
  if (view.kind === 'missing') {
    return (
      <section className="py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Няма започната сесия</h1>
        <Link to="/flashcards" className={`${primaryButton} mt-6`}>
          Към флашкартите
        </Link>
      </section>
    )
  }
  if (view.kind === 'done') return <Summary session={view.session} />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void navigate('/flashcards')}
          aria-label="Затвори (сесията се пази)"
          className={`${iconButton} -ml-2`}
        >
          <X aria-hidden className="size-5" />
        </button>
        <p className="flex-1 text-sm text-muted">
          {mode === 'cram' ? 'Cram · ' : ''}
          {view.remaining === 1 ? 'Остава 1 карта' : `Остават ${view.remaining} карти`}
        </p>
        <button
          type="button"
          onClick={() => void undo()}
          disabled={!canUndo}
          aria-label="Отмени последната оценка"
          title="Отмени последната оценка (Z)"
          className={iconButton}
        >
          <Undo2 aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={() => void finish()} className={quietButton}>
          Приключи
        </button>
      </div>

      {view.kind === 'card' ? (
        <CardStage
          key={`${view.cardId}:${view.shownAt}`}
          view={view}
          cram={mode === 'cram'}
          onRate={(rating, confidence) => void rate(rating, confidence)}
        />
      ) : (
        <section className="rounded-3xl border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold">Почивка</h1>
          <p className="mt-2 text-muted">
            Следващата карта в учене е в {formatTime(view.until)} Може да я видиш и сега.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => void showNow()} className={primaryButton}>
              Покажи сега
            </button>
            <button type="button" onClick={() => void finish()} className={secondaryButton}>
              Приключи за днес
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
