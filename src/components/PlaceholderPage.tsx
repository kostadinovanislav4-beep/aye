import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type PlaceholderInfo = {
  title: string
  description: string
  phase: number
  icon: LucideIcon
}

/** Временен екран на модул: заглавие, какво ще прави модулът и в коя фаза се изгражда. */
export function PlaceholderPage({
  module,
  children,
}: {
  module: PlaceholderInfo
  children?: ReactNode
}) {
  const { title, description, phase, icon: Icon } = module

  return (
    <article className="space-y-6">
      <header className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
          <Icon aria-hidden className="size-7" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
            Фаза {phase}
          </p>
        </div>
      </header>
      <p className="text-base leading-relaxed">{description}</p>
      {children}
      <p className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted">
        Модулът се изгражда във Фаза {phase}.
      </p>
    </article>
  )
}
