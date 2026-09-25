import { Outlet, ScrollRestoration } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { UpdatePrompt } from './UpdatePrompt'
import { useApplyTheme } from './useApplyTheme'

function focusMain(): void {
  document.getElementById('main')?.focus()
}

export function AppLayout() {
  useApplyTheme()

  return (
    <>
      <button
        type="button"
        onClick={focusMain}
        className="sr-only z-50 rounded-xl bg-surface px-4 py-3 font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Към съдържанието
      </button>
      <SideNav />
      <div className="md:pl-72">
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl px-4 pt-6 pb-32 outline-none md:px-8 md:pt-10 md:pb-12"
        >
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <UpdatePrompt />
      <ScrollRestoration />
    </>
  )
}
