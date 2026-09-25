import type { ComponentType } from 'react'
import { createHashRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { AppLoading } from './AppLoading'
import { NotFoundPage } from './NotFoundPage'
import { RouteError } from './RouteError'

type PageModule = { default: ComponentType }

/** Всеки екран е отделен chunk и се зарежда при първото отваряне. */
function page(load: () => Promise<PageModule>) {
  return async () => ({ Component: (await load()).default })
}

// Адресите са с # (…/aye/#/practice), за да работят в GitHub Pages и офлайн без сървърни пренасочвания.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <AppLoading />,
    children: [
      { index: true, lazy: page(() => import('../features/dashboard/DashboardPage')) },
      { path: 'flashcards', lazy: page(() => import('../features/flashcards/FlashcardsPage')) },
      {
        path: 'flashcards/session',
        lazy: page(() => import('../features/flashcards/SessionPage')),
      },
      { path: 'practice', lazy: page(() => import('../features/practice/PracticePage')) },
      { path: 'exam', lazy: page(() => import('../features/exam/ExamPage')) },
      { path: 'writing', lazy: page(() => import('../features/writing/WritingPage')) },
      { path: 'listening-speaking', lazy: page(() => import('../features/audio/AudioPage')) },
      { path: 'errors', lazy: page(() => import('../features/errors/ErrorsPage')) },
      { path: 'planner', lazy: page(() => import('../features/planner/PlannerPage')) },
      { path: 'analytics', lazy: page(() => import('../features/analytics/AnalyticsPage')) },
      { path: 'modes', lazy: page(() => import('../features/modes/ModesPage')) },
      { path: 'review', lazy: page(() => import('../features/review/ReviewPage')) },
      { path: 'settings', lazy: page(() => import('../features/settings/SettingsPage')) },
      { path: 'more', lazy: page(() => import('../features/more/MorePage')) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
