import { useRegisterSW } from 'virtual:pwa-register/react'

/** Колко често се проверява за нова версия, докато приложението е отворено. */
const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * Проверява за нова версия, когато приложението се върне на екрана, и веднъж на час.
 * Инсталираното приложение на iPhone често само се събужда, без да се презарежда —
 * без тази проверка „Обнови“ излиза едва след пълно затваряне.
 */
function watchForUpdates(registration: ServiceWorkerRegistration): void {
  const check = () => {
    if (!navigator.onLine || registration.installing) return
    void registration.update().catch(() => undefined)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  setInterval(check, CHECK_EVERY_MS)
}

/**
 * Съобщава, когато има нова версия или когато приложението вече работи офлайн.
 * Новата версия се включва само след „Обнови“, за да не прекъсва учене.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (registration) watchForUpdates(registration)
    },
  })

  if (!needRefresh && !offlineReady) return null

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 rounded-3xl border border-border bg-surface p-4 shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      <p className="font-medium">
        {needRefresh ? 'Има нова версия на AYE.' : 'AYE вече работи и без интернет.'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="min-h-11 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2"
        >
          {needRefresh ? 'По-късно' : 'Добре'}
        </button>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"
          >
            Обнови
          </button>
        )}
      </div>
    </div>
  )
}
