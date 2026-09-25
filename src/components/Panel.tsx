import { useId, type ReactNode } from 'react'
import { panel } from './styles'

/** Раздел в рамка със заглавие. */
export function Panel({
  title,
  action,
  children,
  className = '',
  id,
}: {
  title?: string
  /** Бутон или връзка вдясно от заглавието. */
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  const headingId = useId()
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={`${panel} ${className}`}
    >
      {title && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-lg font-semibold">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
