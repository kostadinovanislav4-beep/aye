import { currentPlatform, isIosDevice } from '../../app/platform'

export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Записва файл. На iPhone отваря менюто за споделяне („Запази във Файлове“, Telegram…),
 * защото там изтеглянето от инсталирано приложение е ненадеждно. Другаде — изтегляне.
 */
export async function saveFile(name: string, text: string): Promise<SaveResult> {
  const file = new File([text], name, { type: 'application/json' })
  if (isIosDevice(currentPlatform()) && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
