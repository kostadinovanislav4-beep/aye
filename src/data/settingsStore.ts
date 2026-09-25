import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_SETTINGS, normalizeSettings, type SettingsData } from '../domain/settings/settings'
import type { ThemePreference } from '../domain/settings/theme'

/**
 * Ключът в localStorage. Всички GitHub Pages сайтове на един потребител споделят един origin,
 * затова ключовете на AYE започват с „aye:“. index.html чете темата оттук преди първото изрисуване.
 */
export const SETTINGS_STORAGE_KEY = 'aye:settings'

type SettingsActions = {
  setTheme: (theme: ThemePreference) => void
  dismissInstallHint: () => void
  /** Промяна от екрана „Настройки“ — обновява `updatedAt`. */
  update: (patch: Partial<Omit<SettingsData, 'updatedAt' | 'lastBackupAt'>>) => void
  markBackup: (at: number) => void
  /** Настройките след импорт (вече слети). */
  replace: (data: SettingsData) => void
}

export type SettingsState = SettingsData & SettingsActions

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme, updatedAt: Date.now() }),
      // Подсказката и бекъпът са за устройството — не се сливат, затова не местят updatedAt.
      dismissInstallHint: () => set({ installHintDismissed: true }),
      update: (patch) => set({ ...patch, updatedAt: Date.now() }),
      markBackup: (at) => set({ lastBackupAt: at }),
      replace: (data) => set(data),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      // 1 — Фаза 0 (тема и подсказка); 2 — Фаза 1 (всички настройки и updatedAt).
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => normalizeSettings(state),
      migrate: (persisted) => normalizeSettings(persisted),
      merge: (persisted, current) => ({ ...current, ...normalizeSettings(persisted) }),
    },
  ),
)

/** Настройките без функциите — за експорта. */
export function currentSettings(): SettingsData {
  return normalizeSettings(useSettings.getState())
}
