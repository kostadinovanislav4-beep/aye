/** Общите класове за бутони и връзки, които изглеждат като бутони. Зоната е поне 44 px. */
export const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 font-medium transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50'

export const quietButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-50'

export const iconButton =
  'grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40'

export const panel = 'rounded-3xl border border-border bg-surface p-5'

export const input =
  'min-h-11 rounded-2xl border border-border bg-surface px-3 text-base text-text focus-visible:border-accent'
