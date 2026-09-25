import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_THEME, type ThemePreference } from '../domain/settings/theme'

/**
 * Ключът в localStorage. Всички GitHub Pages сайтове на един потребител споделят един origin,
 * затова ключовете на AYE започват с „aye:“. index.html чете темата оттук преди първото изрисуване.
 */
export const SETTINGS_STORAGE_KEY = 'aye:settings'

type SettingsState = {
  theme: ThemePreference
  installHintDismissed: boolean
  setTheme: (theme: ThemePreference) => void
  dismissInstallHint: () => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      installHintDismissed: false,
      setTheme: (theme) => set({ theme }),
      dismissInstallHint: () => set({ installHintDismissed: true }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, installHintDismissed }) => ({ theme, installHintDismissed }),
    },
  ),
)
