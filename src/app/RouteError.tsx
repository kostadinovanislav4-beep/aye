import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return 'Неизвестна грешка.'
}

export function RouteError() {
  const error = useRouteError()

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Нещо се обърка</h1>
      <p className="mt-2 text-muted">
        Екранът не успя да се зареди. Опитай да презаредиш приложението — данните ти са запазени.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 min-h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
      >
        Презареди
      </button>
      <pre className="mt-8 overflow-x-auto rounded-2xl bg-surface-2 p-4 text-xs whitespace-pre-wrap text-muted">
        {describe(error)}
      </pre>
    </main>
  )
}
