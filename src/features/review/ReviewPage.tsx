import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Copy, Flag } from 'lucide-react'
import { useId, useState } from 'react'
import { MODULE } from '../../app/modules'
import { useCatalog } from '../../app/useCatalog'
import { useItem } from '../../app/useItem'
import { ItemPreview } from '../../components/ItemPreview'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { input, primaryButton, quietButton, secondaryButton } from '../../components/styles'
import { allChecks, removeCheck, saveCheck } from '../../data/progress'
import type { CatalogDeck, CatalogItem } from '../../domain/content/catalog'
import type { CheckRecord } from '../../domain/progress/types'
import { formatDate, plural } from '../../domain/text/format'
import { copyText } from './clipboard'

const PAGE = 10

type Entry = { deck: CatalogDeck; item: CatalogItem }

function markItem(entry: Entry, status: CheckRecord['status'], note: string): void {
  void saveCheck(entry.item.id, status, status === 'ok' ? '' : note, entry.item.hash, Date.now())
}

function PendingItem({ entry }: { entry: Entry }) {
  const item = useItem(entry.item.id)
  const [reporting, setReporting] = useState(false)
  const [note, setNote] = useState('')
  const noteId = useId()

  const mark = (status: CheckRecord['status']) => markItem(entry, status, note)

  return (
    <li className="rounded-3xl border border-border bg-surface p-5">
      <p className="mb-3 text-xs text-muted">{entry.deck.title}</p>
      {item === undefined && <p className="text-muted">Зареждане…</p>}
      {item === null && <p className="text-muted">Елементът липсва в съдържанието.</p>}
      {item && <ItemPreview item={item} />}
      {reporting ? (
        <div className="mt-4 space-y-2">
          <label htmlFor={noteId} className="block text-sm font-medium">
            Какво не е наред?
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className={`${input} w-full py-2`}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => mark('problem')}
              disabled={note.trim() === ''}
              className={primaryButton}
            >
              Запази
            </button>
            <button type="button" onClick={() => setReporting(false)} className={quietButton}>
              Отказ
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => mark('ok')} className={primaryButton}>
            <Check aria-hidden className="size-4" />
            Проверено
          </button>
          <button type="button" onClick={() => setReporting(true)} className={secondaryButton}>
            <Flag aria-hidden className="size-4" />
            Има грешка
          </button>
        </div>
      )}
    </li>
  )
}

/** Текстът за Claude: кои елементи са проверени и кои имат грешка. */
function reportText(checked: { entry: Entry; check: CheckRecord }[], now: number): string {
  const ok = checked.filter(({ check }) => check.status === 'ok')
  const problems = checked.filter(({ check }) => check.status === 'problem')
  const lines = [`AYE — проверка на съдържанието (${formatDate(now)})`, '']
  if (ok.length > 0) {
    lines.push('Проверени — да станат "verified": true:')
    for (const { entry } of ok) lines.push(`- ${entry.item.id}`)
    lines.push('')
  }
  if (problems.length > 0) {
    lines.push('С грешка — да се поправят:')
    for (const { entry, check } of problems) lines.push(`- ${entry.item.id}: ${check.note}`)
  }
  return lines.join('\n').trim()
}

function copyReport(checked: { entry: Entry; check: CheckRecord }[]): Promise<boolean> {
  return copyText(reportText(checked, Date.now()))
}

/** „За проверка“: непроверените елементи от съдържанието (раздел 3.1 от SPEC). */
export default function ReviewPage() {
  const catalog = useCatalog()
  const checks = useLiveQuery(() => allChecks(), [])
  const [limit, setLimit] = useState(PAGE)
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)

  if (!catalog || !checks) {
    return (
      <p role="status" className="py-16 text-center text-muted">
        Зареждане…
      </p>
    )
  }

  const unverified: Entry[] = catalog.decks.flatMap((deck) =>
    deck.items.filter((item) => !item.verified).map((item) => ({ deck, item })),
  )
  const current = (entry: Entry) => {
    const check = checks.get(entry.item.id)
    return check && check.hash === entry.item.hash ? check : null
  }
  const pending = unverified.filter((entry) => !current(entry))
  const checked = unverified.flatMap((entry) => {
    const check = current(entry)
    return check ? [{ entry, check }] : []
  })

  const copy = async () => setCopied((await copyReport(checked)) ? 'yes' : 'no')

  return (
    <article className="space-y-6">
      <PageHeader icon={MODULE.review.icon} title={MODULE.review.title}>
        {unverified.length === 0
          ? 'Всичко в съдържанието е сверено с източник.'
          : `${plural(pending.length, 'елемент чака', 'елемента чакат')} проверка`}
      </PageHeader>

      {unverified.length > 0 && (
        <p className="leading-relaxed">
          Тези елементи още не са сверени с източник. Прегледай ги и отбележи „Проверено“ или „Има
          грешка“. После копирай списъка и го изпрати на Claude — така проверените стават
          „verified“, а грешките се поправят в съдържанието.
        </p>
      )}

      {checked.length > 0 && (
        <Panel title={`Прегледани (${checked.length})`}>
          <ul className="space-y-2 text-sm">
            {checked.map(({ entry, check }) => (
              <li key={entry.item.id} className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <code className="font-mono">{entry.item.id}</code>
                  <span className="block text-muted">
                    {check.status === 'ok' ? 'Проверено' : `Има грешка: ${check.note}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void removeCheck(entry.item.id)}
                  className={quietButton}
                >
                  Отмени
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void copy()} className={`${primaryButton} mt-4`}>
            <Copy aria-hidden className="size-4" />
            Копирай за Claude
          </button>
          {copied && (
            <p role="status" className="mt-2 text-sm text-muted">
              {copied === 'yes'
                ? 'Списъкът е копиран.'
                : 'Копирането не успя. Направи бекъп от Настройки и изпрати файла.'}
            </p>
          )}
        </Panel>
      )}

      {pending.length > 0 && (
        <ul className="space-y-4">
          {pending.slice(0, limit).map((entry) => (
            <PendingItem key={entry.item.id} entry={entry} />
          ))}
        </ul>
      )}
      {pending.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className={`${secondaryButton} w-full`}
        >
          Покажи още
        </button>
      )}
    </article>
  )
}
