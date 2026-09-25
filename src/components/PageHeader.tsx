import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Заглавието на екран: икона, заглавие и по желание ред под него. */
export function PageHeader({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
}) {
  return (
    <header className="flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
        <Icon aria-hidden className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
    </header>
  )
}
