import { DEFAULT_THEME, THEME_PREFERENCES, type ThemePreference } from './theme'

/*
 * Настройките (раздел 4.2 от SPEC). Пазят се в localStorage (`aye:settings`) и влизат в
 * експорта. Всяка промяна обновява `updatedAt`, за да се слива като останалите данни.
 */

export type DailyLimitsSetting = { newPerDay: number; reviewsPerDay: number }

/** Свободни минути по дни: понеделник … неделя. */
export type FreeMinutes = [number, number, number, number, number, number, number]

export type SettingsData = {
  theme: ThemePreference
  installHintDismissed: boolean
  /** Датата и часът на изпита като 'YYYY-MM-DDTHH:mm' (местно време) или null. */
  examDates: { bel: string | null; cae: string | null }
  limits: DailyLimitsSetting
  freeMinutes: FreeMinutes
  /** Да се пита ли за увереност преди отговора. */
  askConfidence: boolean
  /** Името на гласа за четене на английски (от наличните в браузъра) или null. */
  ttsVoice: string | null
  lastBackupAt: number | null
  updatedAt: number
}

/** ДЗИ по БЕЛ: 19.05.2027 г., 08:30 ч. (content/SOURCES.md). Датата на CAE още не е известна. */
export const DEFAULT_SETTINGS: SettingsData = {
  theme: DEFAULT_THEME,
  installHintDismissed: false,
  examDates: { bel: '2027-05-19T08:30', cae: null },
  limits: { newPerDay: 20, reviewsPerDay: 200 },
  freeMinutes: [60, 60, 60, 60, 60, 120, 120],
  askConfidence: false,
  ttsVoice: null,
  lastBackupAt: null,
  updatedAt: 0,
}

export const LIMIT_RANGE = {
  newPerDay: { min: 0, max: 200 },
  reviewsPerDay: { min: 0, max: 2000 },
} as const

export const MAX_FREE_MINUTES = 16 * 60

const EXAM_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

type Loose = Record<string, unknown>

function asRecord(value: unknown): Loose {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Loose)
    : {}
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function examDate(value: unknown, fallback: string | null): string | null {
  if (value === null) return null
  return typeof value === 'string' && EXAM_DATE.test(value) ? value : fallback
}

/**
 * Настройки от localStorage или от импортиран файл: непознатите полета отпадат, а липсващите
 * или повредените получават стойността по подразбиране.
 */
export function normalizeSettings(value: unknown): SettingsData {
  const raw = asRecord(value)
  const d = DEFAULT_SETTINGS
  const dates = asRecord(raw.examDates)
  const limits = asRecord(raw.limits)
  const free = Array.isArray(raw.freeMinutes) ? (raw.freeMinutes as unknown[]) : []
  return {
    theme: THEME_PREFERENCES.find((theme) => theme === raw.theme) ?? d.theme,
    installHintDismissed:
      typeof raw.installHintDismissed === 'boolean'
        ? raw.installHintDismissed
        : d.installHintDismissed,
    examDates: {
      bel: examDate(dates.bel, d.examDates.bel),
      cae: examDate(dates.cae, d.examDates.cae),
    },
    limits: {
      newPerDay: clampInt(
        limits.newPerDay,
        LIMIT_RANGE.newPerDay.min,
        LIMIT_RANGE.newPerDay.max,
        d.limits.newPerDay,
      ),
      reviewsPerDay: clampInt(
        limits.reviewsPerDay,
        LIMIT_RANGE.reviewsPerDay.min,
        LIMIT_RANGE.reviewsPerDay.max,
        d.limits.reviewsPerDay,
      ),
    },
    freeMinutes: d.freeMinutes.map((fallback, i) =>
      clampInt(free[i], 0, MAX_FREE_MINUTES, fallback),
    ) as FreeMinutes,
    askConfidence: typeof raw.askConfidence === 'boolean' ? raw.askConfidence : d.askConfidence,
    ttsVoice: typeof raw.ttsVoice === 'string' && raw.ttsVoice ? raw.ttsVoice : null,
    lastBackupAt: typeof raw.lastBackupAt === 'number' ? raw.lastBackupAt : null,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  }
}

/**
 * Настройките след импорт: по-новите печелят, но подсказката за инсталиране и датата на
 * последния бекъп са на устройството и остават.
 */
export function mergeSettings(local: SettingsData, incoming: SettingsData): SettingsData {
  if (incoming.updatedAt <= local.updatedAt) return local
  return {
    ...incoming,
    installHintDismissed: local.installHintDismissed,
    lastBackupAt: local.lastBackupAt,
  }
}

/** Моментът на изпита (местно време) или null. */
export function examTime(date: string | null): number | null {
  if (!date || !EXAM_DATE.test(date)) return null
  const [day = '', time = ''] = date.split('T')
  const [year = 0, month = 1, dayOfMonth = 1] = day.split('-').map(Number)
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return new Date(year, month - 1, dayOfMonth, hours, minutes).getTime()
}
