import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Няма такава страница</h1>
      <p className="mt-2 text-muted">Адресът не съвпада с нито един екран на AYE.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-on-accent"
      >
        Към таблото
      </Link>
    </section>
  )
}
