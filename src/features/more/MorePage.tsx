import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SECONDARY_MODULES } from '../../app/modules'

/** Модулите, които не са в долната лента на телефона. */
export default function MorePage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold tracking-tight">Още</h1>
      <ul className="mt-6 space-y-2">
        {SECONDARY_MODULES.map(({ id, path, title, description, icon: Icon }) => (
          <li key={id}>
            <Link
              to={path}
              className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{description}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
