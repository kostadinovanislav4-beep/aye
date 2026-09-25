import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Съобщава, когато има нова версия или когато приложението вече работи офлайн.
 * Новата версия се включва само след „Обнови“, за да не прекъсва учене.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

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
