import { useLiveQuery } from 'dexie-react-hooks'
import tagsFile from '../../../content/tags.json'
import { MODULE } from '../../app/modules'
import { useCatalog } from '../../app/useCatalog'
import { useItem } from '../../app/useItem'
import { useNow } from '../../app/useNow'
import { ItemPreview } from '../../components/ItemPreview'
import { TYPE_LABEL } from '../../components/typeLabels'
import { PageHeader } from '../../components/PageHeader'
import { Panel } from '../../components/Panel'
import { errorEntries } from '../../data/progress'
import { indexCatalog } from '../../data/content'
import { MASTERY_STREAK, countByTag, reviewOrder } from '../../domain/errors/notebook'
import { splitTargetId } from '../../domain/progress/ids'
import type { ErrorRecord } from '../../domain/progress/types'
import { formatDate, plural } from '../../domain/text/format'

const TAG_LABEL = new Map(tagsFile.tags.map((tag) => [tag.id, tag.label]))

/** „Празно място 3“, „Въпрос 2“, „Грешка 1“… за частите на задачите. */
function partLabel(part: string): string {
  const number = part.slice(1)
  switch (part[0]) {
    case 'g':
      return `Празно място ${number}`
    case 'q':
      return `Въпрос ${number}`
    case 'e':
      return `Грешка ${number}`
    case 'c':
      return `Скрита част ${number}`
    default:
      return 'Задачата'
  }
}

function ItemDetails({ itemId }: { itemId: string }) {
  const item = useItem(itemId)
  if (item === undefined) return <p className="text-muted">Зареждане…</p>
  if (item === null) return <p className="text-muted">Елементът вече не е в съдържанието.</p>
  return <ItemPreview item={item} />
}

/** Тетрадката на грешките (раздел 5.7 от SPEC). */
export default function ErrorsPage() {
  const entries = useLiveQuery(() => errorEntries(), [])
  const catalog = useCatalog()
  const now = useNow()

  if (!entries || !catalog) {
    return (
      <p role="status" className="py-16 text-center text-muted">
        Зареждане…
      </p>
    )
  }

  const index = indexCatalog(catalog)
  const active = reviewOrder(entries, now)
  const waiting = entries.filter(
    (entry) => entry.status === 'active' && !active.includes(entry),
  ).length
  const mastered = entries.filter((entry) => entry.status === 'mastered').length

  // Записите по елементи, в реда на приоритета.
  const groups = new Map<string, ErrorRecord[]>()
  for (const entry of active) groups.set(entry.itemId, [...(groups.get(entry.itemId) ?? []), entry])

  const tagsOf = (entry: ErrorRecord) => {
    const found = index.get(entry.itemId)
    const part = splitTargetId(entry.id).part
    const own = found?.item.partTags?.[part]
    return own ? [own] : (found?.item.tags ?? [])
  }
  const topTags = [
    ...countByTag(
      entries.filter((entry) => entry.status === 'active'),
      tagsOf,
    ),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <article className="space-y-6">
      <PageHeader icon={MODULE.errors.icon} title={MODULE.errors.title}>
        {plural(active.length + waiting, 'активна грешка', 'активни грешки')} ·{' '}
        {plural(mastered, 'усвоена', 'усвоени')}
      </PageHeader>

      <p className="leading-relaxed">
        Тук влиза всяка грешка от практиката и симулациите — поотделно за всяко празно място или
        въпрос. Грешката е усвоена след {MASTERY_STREAK} поредни верни отговора в различни дни.
      </p>

      {entries.length === 0 && (
        <Panel>
          <p className="text-muted">
            Тетрадката е празна. Грешките ще се появяват тук, щом започнеш да решаваш задачи.
          </p>
        </Panel>
      )}

      {waiting > 0 && (
        <p className="text-sm text-muted">
          {waiting === 1
            ? '1 грешка е отговорена вярно днес и чака утрешния ден.'
            : `${waiting} грешки са отговорени вярно днес и чакат утрешния ден.`}
        </p>
      )}

      {topTags.length > 0 && (
        <Panel title="По кои тагове греша">
          <ol className="space-y-1">
            {topTags.map(([tag, count]) => (
              <li key={tag} className="flex justify-between gap-3">
                <span>{TAG_LABEL.get(tag) ?? tag}</span>
                <span className="text-muted">{count}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {groups.size > 0 && (
        <ul className="space-y-3">
          {[...groups].map(([itemId, parts]) => {
            const found = index.get(itemId)
            return (
              <li key={itemId} className="rounded-3xl border border-border bg-surface p-4">
                <p className="font-semibold">
                  {found ? TYPE_LABEL[found.item.type] : 'Елемент'} ·{' '}
                  <span className="font-normal text-muted">{found?.deck.title ?? itemId}</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {parts.map((entry) => (
                    <li key={entry.id}>
                      {partLabel(splitTargetId(entry.id).part)}:{' '}
                      {plural(entry.wrongCount, 'грешка', 'грешки')}, поредни верни {entry.streak}{' '}
                      от {MASTERY_STREAK}
                      <span className="text-muted">
                        {' '}
                        · последна грешка {formatDate(entry.lastWrongAt)}
                      </span>
                    </li>
                  ))}
                </ul>
                <details className="mt-1">
                  <summary className="cursor-pointer py-3 text-sm font-medium text-accent-strong">
                    Покажи задачата
                  </summary>
                  <div className="border-t border-border pt-4">
                    <ItemDetails itemId={itemId} />
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
