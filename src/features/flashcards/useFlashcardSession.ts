import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from '../../app/useCatalog'
import { loadItems } from '../../data/content'
import {
  cardsDueBefore,
  finishSession,
  getCards,
  rateInSession,
  resumableSession,
  skipQueued,
  undoLastRating,
} from '../../data/progress'
import type { Catalog } from '../../domain/content/catalog'
import type { ContentItem } from '../../domain/content/schema'
import { scopeCardIds } from '../../domain/content/scope'
import { itemIdOf } from '../../domain/progress/ids'
import type { CardRecord, Confidence, Rating, SessionRecord } from '../../domain/progress/types'
import { nextStep, type LearningCard } from '../../domain/srs/queue'
import { nextStudyDayStart } from '../../domain/time/studyDay'

/** Над това време отговорът не се брои по-дълъг — картата е била оставена отворена. */
const MAX_DURATION_MS = 120_000

export type SessionView =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | {
      kind: 'card'
      cardId: string
      fromQueue: boolean
      item: ContentItem
      record: CardRecord | null
      shownAt: number
      remaining: number
    }
  | { kind: 'wait'; until: number; remaining: number }
  | { kind: 'done'; session: SessionRecord }

async function learningInScope(
  catalog: Catalog,
  session: SessionRecord,
  now: number,
): Promise<LearningCard[]> {
  if (session.mode !== 'srs') return []
  const inScope = new Set(scopeCardIds(catalog, session.scope))
  const due = await cardsDueBefore(nextStudyDayStart(now))
  return due
    .filter((row) => inScope.has(row.id) && (row.state === 1 || row.state === 3))
    .map((row) => ({ id: row.id, due: row.due }))
}

/** Какво да се покаже сега. `ahead` показва чакащата карта в учене веднага. */
async function resolve(
  catalog: Catalog,
  session: SessionRecord,
  ahead = false,
): Promise<SessionView> {
  let current = session
  for (;;) {
    const now = Date.now()
    const learning = await learningInScope(catalog, current, now)
    const step = nextStep({
      now: ahead ? Math.max(now, ...learning.map((card) => card.due)) : now,
      queue: current.queue,
      position: current.position,
      learning,
    })
    const remaining = Math.max(0, current.queue.length - current.position) + learning.length
    if (step.kind === 'done') {
      return { kind: 'done', session: (await finishSession(current.id, now)) ?? current }
    }
    if (step.kind === 'wait') return { kind: 'wait', until: step.until, remaining }

    const itemId = itemIdOf(step.id)
    const [items, records] = await Promise.all([loadItems([itemId]), getCards([step.id])])
    const item = items.get(itemId)
    if (item) {
      return {
        kind: 'card',
        cardId: step.id,
        fromQueue: step.fromQueue,
        item,
        record: records.get(step.id) ?? null,
        shownAt: Date.now(),
        remaining,
      }
    }
    // Елементът е махнат от съдържанието след началото на сесията — прескачаме го.
    const skipped = step.fromQueue ? await skipQueued(current.id, now) : null
    if (!skipped) return { kind: 'done', session: current }
    current = skipped
  }
}

export function useFlashcardSession(mode: 'srs' | 'cram') {
  const catalog = useCatalog()
  const [session, setSession] = useState<SessionRecord | null>(null)
  const [view, setView] = useState<SessionView>({ kind: 'loading' })
  const busy = useRef(false)

  const show = useCallback(
    async (next: SessionRecord, ahead = false) => {
      if (!catalog) return
      setSession(next)
      setView(await resolve(catalog, next, ahead))
    },
    [catalog],
  )

  useEffect(() => {
    if (!catalog) return
    let active = true
    void resumableSession(mode, Date.now()).then(async (found) => {
      if (!active) return
      if (!found) {
        setView({ kind: 'missing' })
        return
      }
      const next = await resolve(catalog, found)
      if (!active) return
      setSession(found)
      setView(next)
    })
    return () => {
      active = false
    }
  }, [catalog, mode])

  // Когато дойде времето на чакащата карта в учене, тя се показва сама.
  useEffect(() => {
    if (view.kind !== 'wait' || !session) return
    const timer = setTimeout(() => void show(session), Math.max(0, view.until - Date.now()) + 250)
    return () => clearTimeout(timer)
  }, [view, session, show])

  /** Изпълнява едно действие наведнъж — двоен клик не оценява картата два пъти. */
  const once = useCallback(async (action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    try {
      await action()
    } finally {
      busy.current = false
    }
  }, [])

  const rate = useCallback(
    (rating: Rating, confidence?: Confidence) =>
      once(async () => {
        if (view.kind !== 'card' || !session) return
        const now = Date.now()
        const next = await rateInSession({
          sessionId: session.id,
          cardId: view.cardId,
          rating,
          now,
          durationMs: Math.min(now - view.shownAt, MAX_DURATION_MS),
          fromQueue: view.fromQueue,
          ...(confidence === undefined ? {} : { confidence }),
        })
        await show(next)
      }),
    [once, view, session, show],
  )

  const undo = useCallback(
    () =>
      once(async () => {
        if (!session?.undo) return
        const next = await undoLastRating(session.id, Date.now())
        if (next) await show(next)
      }),
    [once, session, show],
  )

  const finish = useCallback(
    () =>
      once(async () => {
        if (!session) return
        const done = await finishSession(session.id, Date.now())
        if (done) setView({ kind: 'done', session: done })
      }),
    [once, session],
  )

  const showNow = useCallback(
    () =>
      once(async () => {
        if (session) await show(session, true)
      }),
    [once, session, show],
  )

  return { view, session, rate, undo, finish, showNow, canUndo: Boolean(session?.undo) }
}
