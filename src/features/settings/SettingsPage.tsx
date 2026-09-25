import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { MODULE } from '../../app/modules'
import { PlaceholderPage } from '../../components/PlaceholderPage'
import { useSettings } from '../../data/settingsStore'
import type { ThemePreference } from '../../domain/settings/theme'

const THEME_OPTIONS: readonly { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Светла', icon: Sun },
  { value: 'dark', label: 'Тъмна', icon: Moon },
  { value: 'system', label: 'Според устройството', icon: Monitor },
]

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

export default function SettingsPage() {
  return (
    <PlaceholderPage module={MODULE.settings}>
      <ThemePicker />
    </PlaceholderPage>
  )
}
