import { Share, X } from 'lucide-react'
import { useState } from 'react'
import { currentPlatform, isIosDevice, isStandalone } from '../../app/platform'
import { useSettings } from '../../data/settingsStore'

/**
 * Подсказка за iPhone: как да се добави AYE на началния екран.
 * Показва се само в Safari на iOS, докато приложението не е инсталирано.
 */
export function InstallHint() {
  const dismissed = useSettings((state) => state.installHintDismissed)
  const dismiss = useSettings((state) => state.dismissInstallHint)
  const [relevant] = useState(() => isIosDevice(currentPlatform()) && !isStandalone())

  if (!relevant || dismissed) return null

  return (
    <aside
      aria-labelledby="install-hint-title"
      className="relative mb-6 rounded-3xl border border-accent bg-accent-soft p-5"
    >
      <h2 id="install-hint-title" className="pr-10 font-semibold">
        Инсталирай AYE на началния екран
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        В Safari натисни бутона за споделяне{' '}
        <Share aria-hidden className="inline size-4 align-[-2px]" /> и избери добавяне към началния
        екран. Така AYE работи и без интернет, а данните ти са по-защитени.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Скрий подсказката"
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-muted hover:bg-surface"
      >
        <X aria-hidden className="size-5" />
      </button>
    </aside>
  )
}
