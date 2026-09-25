import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Panel } from '../../components/Panel'
import { primaryButton, secondaryButton } from '../../components/styles'
import { backupFileName, createBackup, importBackup } from '../../data/backup'
import { isStoragePersisted } from '../../data/persist'
import { currentSettings, useSettings } from '../../data/settingsStore'
import { BackupError, parseBackup, type ImportSummary } from '../../domain/progress/backup'
import { mergeSettings } from '../../domain/settings/settings'
import { formatDate, plural } from '../../domain/text/format'
import { saveFile } from './saveFile'

type Status = { kind: 'ok' | 'error'; text: string } | null

const SUMMARY_LABELS: [keyof ImportSummary, string, string][] = [
  ['cards', 'карта', 'карти'],
  ['reviews', 'оценка', 'оценки'],
  ['attempts', 'отговор', 'отговора'],
  ['errors', 'запис в тетрадката', 'записа в тетрадката'],
  ['sessions', 'сесия', 'сесии'],
  ['exams', 'симулация', 'симулации'],
  ['writings', 'текст', 'текста'],
  ['checks', 'проверка', 'проверки'],
]

function describe(summary: ImportSummary): string {
  const parts = SUMMARY_LABELS.filter(([key]) => summary[key] > 0).map(([key, one, many]) =>
    plural(summary[key], one, many),
  )
  return parts.length > 0
    ? `Импортът е готов. Добавени или обновени: ${parts.join(', ')}.`
    : 'Няма нови данни — всичко от файла вече е тук.'
}

/** Експорт и импорт на всички данни в един JSON файл (раздел 2 от SPEC). */
export function BackupPanel() {
  const lastBackupAt = useSettings((state) => state.lastBackupAt)
  const markBackup = useSettings((state) => state.markBackup)
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  const exportAll = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const now = Date.now()
      const backup = await createBackup(currentSettings(), now)
      const result = await saveFile(backupFileName(now), JSON.stringify(backup))
      if (result !== 'cancelled') {
        markBackup(now)
        setStatus({ kind: 'ok', text: 'Бекъпът е готов. Пази файла извън телефона.' })
      }
    } catch {
      setStatus({ kind: 'error', text: 'Бекъпът не успя. Опитай пак.' })
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File) => {
    setBusy(true)
    setStatus(null)
    try {
      let data: unknown
      try {
        data = JSON.parse(await file.text())
      } catch {
        throw new BackupError('Файлът не е валиден JSON.')
      }
      const backup = parseBackup(data)
      const summary = await importBackup(backup)
      useSettings.getState().replace(mergeSettings(currentSettings(), backup.settings))
      setStatus({ kind: 'ok', text: describe(summary) })
    } catch (error) {
      const text =
        error instanceof BackupError ? error.message : 'Импортът не успя. Данните не са променени.'
      setStatus({ kind: 'error', text })
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <Panel title="Бекъп" id="backup">
      <p className="leading-relaxed">
        Всички данни са само на това устройство. Бекъпът е един файл с прогреса, настройките и
        твоите текстове. Импортът го слива с данните тук и не изтрива нищо.
      </p>
      <p className="mt-2 text-sm text-muted">
        {lastBackupAt ? `Последен бекъп: ${formatDate(lastBackupAt)}` : 'Още няма бекъп.'}
        {persisted === true && ' Браузърът пази данните от автоматично изтриване.'}
        {persisted === false &&
          ' Браузърът може да изтрие данните при недостиг на място — затова бекъпът е важен.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void exportAll()}
          disabled={busy}
          className={primaryButton}
        >
          <Download aria-hidden className="size-4" />
          Направи бекъп
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className={secondaryButton}
        >
          <Upload aria-hidden className="size-4" />
          Импортирай
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
          }}
        />
      </div>
      {status && (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm ${status.kind === 'error' ? 'font-medium' : 'text-muted'}`}
        >
          {status.text}
        </p>
      )}
    </Panel>
  )
}
