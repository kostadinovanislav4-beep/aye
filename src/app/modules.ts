import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ChartLine,
  Dumbbell,
  Headphones,
  Layers,
  LayoutDashboard,
  NotebookPen,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react'

export type ModuleId =
  | 'dashboard'
  | 'flashcards'
  | 'practice'
  | 'exam'
  | 'writing'
  | 'audio'
  | 'errors'
  | 'planner'
  | 'analytics'
  | 'modes'
  | 'review'
  | 'settings'

export type AppModule = {
  readonly id: ModuleId
  /** Път в приложението (след #). */
  readonly path: string
  readonly title: string
  /** Кратък етикет за навигацията. */
  readonly navLabel: string
  readonly description: string
  /** Фазата от SPEC, в която модулът се изгражда. */
  readonly phase: number
  readonly icon: LucideIcon
  /** Дали е в долната лента на телефона. Останалите са в „Още“. */
  readonly primary: boolean
}

export const MODULE: Readonly<Record<ModuleId, AppModule>> = {
  dashboard: {
    id: 'dashboard',
    path: '/',
    title: 'Табло',
    navLabel: 'Табло',
    description:
      'Обратно броене до изпитите, планът за деня, серията ти и слабите места, които да тренираш.',
    phase: 1,
    icon: LayoutDashboard,
    primary: true,
  },
  flashcards: {
    id: 'flashcards',
    path: '/flashcards',
    title: 'Флашкарти',
    navLabel: 'Карти',
    description:
      'Преговор с разпределено повторение по алгоритъма FSRS. Оценяваш всяка карта с „Отново“, „Трудно“, „Добре“ или „Лесно“.',
    phase: 1,
    icon: Layers,
    primary: true,
  },
  practice: {
    id: 'practice',
    path: '/practice',
    title: 'Практика',
    navLabel: 'Практика',
    description:
      'Упражнения по тип задача с незабавна обратна връзка. Виждаш защо верният отговор е верен и защо другите са грешни.',
    phase: 4,
    icon: Dumbbell,
    primary: true,
  },
  exam: {
    id: 'exam',
    path: '/exam',
    title: 'Изпитен симулатор',
    navLabel: 'Изпит',
    description:
      'Пълни варианти на ДЗИ и отделните компоненти на C1 Advanced с реалните времена, таймер и подробен отчет.',
    phase: 4,
    icon: Timer,
    primary: true,
  },
  writing: {
    id: 'writing',
    path: '/writing',
    title: 'Лаборатория за писане',
    navLabel: 'Писане',
    description:
      'План, писане с таймер и брояч на думи, самооценка по официалните критерии и сравнение с примерен текст.',
    phase: 5,
    icon: PenLine,
    primary: false,
  },
  audio: {
    id: 'audio',
    path: '/listening-speaking',
    title: 'Слушане и говорене',
    navLabel: 'Слушане',
    description:
      'Listening по скриптове, прочетени от гласов синтез, и Speaking с таймери, запис и самооценка.',
    phase: 5,
    icon: Headphones,
    primary: false,
  },
  errors: {
    id: 'errors',
    path: '/errors',
    title: 'Тетрадка на грешките',
    navLabel: 'Грешки',
    description:
      'Всяка грешка от практиката и симулациите остава тук, докато не отговориш вярно три пъти поред в различни дни.',
    phase: 1,
    icon: NotebookPen,
    primary: false,
  },
  planner: {
    id: 'planner',
    path: '/planner',
    title: 'Планер',
    navLabel: 'Планер',
    description:
      'Дневен план, изчислен назад от датите на изпитите и свободното ти време. Преизчислява се, ако изоставаш или изпреварваш.',
    phase: 6,
    icon: CalendarDays,
    primary: false,
  },
  analytics: {
    id: 'analytics',
    path: '/analytics',
    title: 'Аналитика',
    navLabel: 'Аналитика',
    description:
      'Овладяване по теми, точност във времето и прогноза колко ще покриеш до изпита при сегашното темпо.',
    phase: 6,
    icon: ChartLine,
    primary: false,
  },
  modes: {
    id: 'modes',
    path: '/modes',
    title: 'Режими',
    navLabel: 'Режими',
    description:
      '„Познай произведението“, режим „Файнман“, дневно предизвикателство, лов на грешки, микросесии и още.',
    phase: 6,
    icon: Sparkles,
    primary: false,
  },
  review: {
    id: 'review',
    path: '/review',
    title: 'За проверка',
    navLabel: 'За проверка',
    description:
      'Елементи, които още не са сверени с източник. Тук ги преглеждаш и отбелязваш като проверени.',
    phase: 1,
    icon: ShieldCheck,
    primary: false,
  },
  settings: {
    id: 'settings',
    path: '/settings',
    title: 'Настройки',
    navLabel: 'Настройки',
    description: 'Датите на изпитите, дневните лимити, гласът за четене и свободното време по дни.',
    phase: 1,
    icon: Settings,
    primary: false,
  },
}

export const MODULE_LIST: readonly AppModule[] = Object.values(MODULE)
export const PRIMARY_MODULES = MODULE_LIST.filter((module) => module.primary)
export const SECONDARY_MODULES = MODULE_LIST.filter((module) => !module.primary)
