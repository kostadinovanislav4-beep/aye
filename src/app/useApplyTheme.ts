import { useEffect, useSyncExternalStore } from 'react'
import { useSettings } from '../data/settingsStore'
import { resolveTheme, type ResolvedTheme } from '../domain/settings/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

// Цветът на лентата на браузъра — същият като фона на темата (src/styles/index.css).
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f4f8fd',
  dark: '#0b1a2a',
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

/** Прилага избраната тема към <html> и към цвета на лентата на браузъра. */
export function useApplyTheme(): void {
  const preference = useSettings((state) => state.theme)
  const systemDark = useSyncExternalStore(subscribe, systemPrefersDark)
  const theme = resolveTheme(preference, systemDark)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])
}
