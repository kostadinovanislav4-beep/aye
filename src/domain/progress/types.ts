import type { Exam } from '../content/schema'

/*
 * Схемата на прогреса (раздел 4.2 от SPEC, одобрена във Фаза 1).
 * Всички времена са в милисекунди (Date.now()). Прогресът се връзва със съдържанието
 * само чрез id на елемента, който не се сменя никога.
 */

/** Стойност, която може да се запише в JSON (отговорите се пазят в този вид). */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** Оценка при преговор: 1 „Отново“, 2 „Трудно“, 3 „Добре“, 4 „Лесно“ (както във FSRS). */
export type Rating = 1 | 2 | 3 | 4

/** Състояние на карта по FSRS: 0 нова, 1 учене, 2 преговор, 3 повторно учене. */
export type CardState = 0 | 1 | 2 | 3

/** Увереност преди отговора: 1 „Налучквам“, 2 „Може би“, 3 „Вероятно“, 4 „Сигурно“. */
export type Confidence = 1 | 2 | 3 | 4

// ——— cards ———

/** Една карта за преговор. Нова карта няма ред — той се създава при първата оценка. */
export type CardRecord = {
  /** id на елемента (basic) или `<id>#cN` (изтриване N в cloze). */
  id: string
  due: number
  stability: number
  difficulty: number
  /** Интервалът в дни, насрочен при последната оценка. */
  scheduledDays: number
  /** Текущата стъпка при учене и повторно учене. */
  learningSteps: number
  reps: number
  lapses: number
  state: CardState
  lastReview: number | null
  updatedAt: number
}

// ——— reviews ———

/** `srs` мести графика по FSRS; `cram` само се записва (преговор преди изпит). */
export type ReviewMode = 'srs' | 'cram'

/** Една оценка на карта. Дневник — редовете не се променят. */
export type ReviewRecord = {
  id: string
  cardId: string
  at: number
  rating: Rating
  mode: ReviewMode
  /** Състоянието на картата преди оценката (0 — картата е нова). */
  stateBefore: CardState
  /** От показването на картата до оценката. */
  durationMs: number
  confidence?: Confidence
  sessionId?: string
}

// ——— attempts ———

export type AttemptMode = 'practice' | 'errors' | 'exam' | 'challenge'

/** Точки за една част: празно място (g1…), въпрос (q1…), грешка при редактиране (e1…). */
export type PartScore = { key: string; score: number; max: number }

/** Един отговор на задача извън SRS. Дневник — редовете не се променят. */
export type AttemptRecord = {
  id: string
  itemId: string
  at: number
  mode: AttemptMode
  /** Отговорът както е даден; видът му зависи от типа на елемента (src/domain/eval). */
  response: Json
  score: number
  max: number
  /** Само при задачи с няколко части. */
  parts?: PartScore[]
  durationMs: number
  confidence?: Confidence
  sessionId?: string
  examId?: string
}

// ——— errors ———

export type ErrorStatus = 'active' | 'mastered'

/** Един запис в тетрадката на грешките: елемент или част от него. */
export type ErrorRecord = {
  /** `<id>` или `<id>#g3`, `<id>#q2`, `<id>#e1`, `<id>#c1`. */
  id: string
  itemId: string
  status: ErrorStatus
  wrongCount: number
  /** Поредни верни отговори в различни учебни дни след последната грешка. */
  streak: number
  firstWrongAt: number
  lastWrongAt: number
  lastRightAt: number | null
  masteredAt: number | null
  /** Режимът, в който е последната грешка. */
  lastMode: AttemptMode
  /** Последният грешен отговор — за показване в тетрадката. */
  lastResponse: Json
  updatedAt: number
}

// ——— sessions ———

export type SessionMode = 'srs' | 'cram' | 'practice' | 'errors' | 'challenge'
export type SessionStatus = 'active' | 'done'

/** Какво влиза в сесията. Празен списък означава „всички“. */
export type SessionScope = {
  exam?: Exam
  decks?: string[]
  tags?: string[]
  difficulty?: number[]
}

/** Какво е нужно, за да се отмени последната оценка. */
export type UndoEntry = {
  reviewId: string
  cardId: string
  /** Картата преди оценката; null — картата е била нова. */
  before: CardRecord | null
  position: number
  /** Опашката преди оценката — в cram сгрешената карта се връща в нея. */
  queue?: string[]
}

export type SessionStats = {
  answered: number
  correct: number
  /** Брой оценки „Отново“, „Трудно“, „Добре“, „Лесно“. */
  ratings: [number, number, number, number]
}

/** Една учебна сесия. Незавършената сесия се възстановява след затваряне. */
export type SessionRecord = {
  id: string
  mode: SessionMode
  status: SessionStatus
  startedAt: number
  endedAt: number | null
  updatedAt: number
  scope: SessionScope
  /** Картите или елементите по ред. */
  queue: string[]
  /** Колко от опашката са минати. */
  position: number
  stats: SessionStats
  undo: UndoEntry | null
}

// ——— exams ———

export type ExamStatus = 'active' | 'finished' | 'abandoned'

export type ExamPart = { id: string; title: string; items: string[] }

export type ExamPartScore = { id: string; score: number; max: number }

/** Една симулация на изпит или компонент. */
export type ExamRecord = {
  id: string
  exam: Exam
  /** Вид симулация, напр. `bel-full` или `cae-reading-uoe`. */
  kind: string
  /** Вариантът: елементите по части и по ред. */
  parts: ExamPart[]
  /** id на елемента → отговор. */
  answers: Record<string, Json>
  /** Задачите, маркирани „за преглед“. */
  flagged: string[]
  /** id на елемента → време в милисекунди. */
  timeByItem: Record<string, number>
  elapsedMs: number
  limitMs: number
  status: ExamStatus
  startedAt: number
  finishedAt: number | null
  updatedAt: number
  result: { score: number; max: number; parts: ExamPartScore[] } | null
}

// ——— writings ———

export type WritingStatus = 'draft' | 'saved'

/** Една версия на мой текст. Версиите на един текст имат общ `pieceId`. */
export type WritingRecord = {
  id: string
  pieceId: string
  version: number
  /** Заданието (writing_task) или null за свободен текст. */
  taskId: string | null
  genre: string
  status: WritingStatus
  plan: { thesis: string; points: string[] } | null
  text: string
  words: number
  /** Време за писане в секунди. */
  seconds: number
  /** Самооценка: id на критерий → точки. */
  selfScores: Record<string, number> | null
  /** Отметките от чеклиста на заданието. */
  checklist: boolean[] | null
  examId: string | null
  createdAt: number
  updatedAt: number
}

// ——— checks ———

export type CheckStatus = 'ok' | 'problem'

/** Моята проверка на елемент от екрана „За проверка“. */
export type CheckRecord = {
  /** id на елемента. */
  id: string
  status: CheckStatus
  note: string
  /** Отпечатъкът на елемента при проверката. Ако елементът се промени, излиза отново. */
  hash: string
  at: number
  updatedAt: number
}

/** Всички таблици в базата и типовете на редовете им. */
export type ProgressTables = {
  cards: CardRecord
  reviews: ReviewRecord
  attempts: AttemptRecord
  errors: ErrorRecord
  sessions: SessionRecord
  exams: ExamRecord
  writings: WritingRecord
  checks: CheckRecord
}

export type TableName = keyof ProgressTables

export const TABLE_NAMES = [
  'cards',
  'reviews',
  'attempts',
  'errors',
  'sessions',
  'exams',
  'writings',
  'checks',
] as const satisfies readonly TableName[]

/** Дневниците: редовете им не се променят и при импорт се обединяват по id. */
export const LOG_TABLES = ['reviews', 'attempts'] as const satisfies readonly TableName[]
