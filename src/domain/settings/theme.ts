export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

/** Какво е избрано в Настройки: светла, тъмна или според устройството. */
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** Темата, която реално се показва. */
export type ResolvedTheme = 'light' | 'dark'

export const DEFAULT_THEME: ThemePreference = 'light'

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
