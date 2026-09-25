import { Monitor, Moon, Sun, Volume2, type LucideIcon } from 'lucide-react'
import { useEffect, useId } from 'react'
import { useLocation } from 'react-router-dom'
import { MODULE } from '../../app/modules'
import { canSpeak, speak, useEnglishVoices } from '../../app/speech'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { input, quietButton, secondaryButton } from '../../components/styles'
import { useSettings } from '../../data/settingsStore'
import {
  LIMIT_RANGE,
  MAX_FREE_MINUTES,
  type FreeMinutes,
  type SettingsData,
} from '../../domain/settings/settings'
import type { ThemePreference } from '../../domain/settings/theme'
import { BackupPanel } from './BackupPanel'
import { NumberField } from './NumberField'

const THEME_OPTIONS: readonly { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Светла', icon: Sun },
  { value: 'dark', label: 'Тъмна', icon: Moon },
  { value: 'system', label: 'Според устройството', icon: Monitor },
]

const WEEKDAYS = [
  'Понеделник',
  'Вторник',
  'Сряда',
  'Четвъртък',
  'Петък',
  'Събота',
  'Неделя',
] as const

function ThemePicker() {
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)

  return (
    <fieldset className="rounded-3xl border border-border bg-surface p-5">
      <legend className="px-1 text-lg font-semibold">Тема</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border px-4 py-3 has-checked:border-accent has-checked:bg-accent-soft has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon aria-hidden className="size-5 shrink-0" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type ExamKey = keyof SettingsData['examDates']

function ExamDate({ exam, label }: { exam: ExamKey; label: string }) {
  const value = useSettings((state) => state.examDates[exam])
  const dates = useSettings((state) => state.examDates)
  const update = useSettings((state) => state.update)
  const dateId = useId()
  const timeId = useId()
  const [date = '', time = ''] = value ? value.split('T') : []

  const save = (nextDate: string, nextTime: string) => {
    const next = nextDate ? `${nextDate}T${nextTime || '09:00'}` : null
    update({ examDates: { ...dates, [exam]: next } })
  }

  return (
    <div className="space-y-2">
      <p className="font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={dateId} className="sr-only">
          Дата — {label}
        </label>
        <input
          id={dateId}
          type="date"
          value={date}
          onChange={(event) => save(event.target.value, time)}
          className={input}
        />
        <label htmlFor={timeId} className="sr-only">
          Час — {label}
        </label>
        <input
          id={timeId}
          type="time"
          value={time}
          disabled={!date}
          onChange={(event) => save(date, event.target.value)}
          className={input}
        />
        {value && (
          <button type="button" onClick={() => save('', '')} className={quietButton}>
            Изчисти
          </button>
        )}
      </div>
    </div>
  )
}

function VoicePicker() {
  const voice = useSettings((state) => state.ttsVoice)
  const update = useSettings((state) => state.update)
  const voices = useEnglishVoices()
  const id = useId()

  if (!canSpeak()) {
    return (
      <p className="text-muted">
        Браузърът не може да чете на глас. Скриптовете се показват като текст.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block">
        Английски глас за картите и за Listening
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id={id}
          value={voice ?? ''}
          onChange={(event) => update({ ttsVoice: event.target.value || null })}
          className={`${input} max-w-full min-w-0 flex-1`}
        >
          <option value="">По подразбиране</option>
          {voices.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name} ({option.lang})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => speak('Practice makes perfect.', voice)}
          className={secondaryButton}
        >
          <Volume2 aria-hidden className="size-4" />
          Чуй
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { hash } = useLocation()
  const limits = useSettings((state) => state.limits)
  const askConfidence = useSettings((state) => state.askConfidence)
  const freeMinutes = useSettings((state) => state.freeMinutes)
  const update = useSettings((state) => state.update)
  const confidenceId = useId()

  // Връзката „Направи бекъп“ от таблото води направо до бекъпа.
  useEffect(() => {
    if (hash === '#backup') document.getElementById('backup')?.scrollIntoView()
  }, [hash])

  const setFree = (day: number, minutes: number) => {
    const next = [...freeMinutes] as FreeMinutes
    next[day] = minutes
    update({ freeMinutes: next })
  }

  return (
    <article className="space-y-6">
      <PageHeader icon={MODULE.settings.icon} title={MODULE.settings.title} />

      <Panel title="Изпити">
        <div className="space-y-4">
          <ExamDate exam="bel" label="ДЗИ по БЕЛ" />
          <ExamDate exam="cae" label="C1 Advanced" />
        </div>
      </Panel>

      <Panel title="Флашкарти">
        <div className="space-y-3">
          <NumberField
            label="Нови карти на ден"
            value={limits.newPerDay}
            min={LIMIT_RANGE.newPerDay.min}
            max={LIMIT_RANGE.newPerDay.max}
            onChange={(newPerDay) => update({ limits: { ...limits, newPerDay } })}
          />
          <NumberField
            label="Преговори на ден"
            value={limits.reviewsPerDay}
            min={LIMIT_RANGE.reviewsPerDay.min}
            max={LIMIT_RANGE.reviewsPerDay.max}
            onChange={(reviewsPerDay) => update({ limits: { ...limits, reviewsPerDay } })}
          />
          <div className="flex items-start gap-3 pt-2">
            <input
              id={confidenceId}
              type="checkbox"
              checked={askConfidence}
              onChange={(event) => update({ askConfidence: event.target.checked })}
              className="mt-1 size-5 shrink-0 accent-accent-strong"
            />
            <label htmlFor={confidenceId}>
              Питай за увереност преди отговора
              <span className="block text-sm text-muted">
                Преди да видиш отговора, избираш колко вероятно е да го знаеш. Така по-късно се
                вижда дали увереността съвпада с точността.
              </span>
            </label>
          </div>
        </div>
      </Panel>

      <Panel title="Свободно време по дни">
        <p className="mb-3 text-sm text-muted">
          Минути за учене във всеки ден от седмицата. По тях планерът ще разпределя ученето до
          изпитите.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {WEEKDAYS.map((day, i) => (
            <NumberField
              key={day}
              label={day}
              value={freeMinutes[i] ?? 0}
              min={0}
              max={MAX_FREE_MINUTES}
              suffix="мин"
              onChange={(minutes) => setFree(i, minutes)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Четене на глас">
        <VoicePicker />
      </Panel>

      <ThemePicker />

      <BackupPanel />
    </article>
  )
}
