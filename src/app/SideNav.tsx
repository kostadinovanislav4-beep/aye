import { NavLink } from 'react-router-dom'
import { AppMark } from '../components/AppMark'
import { MODULE_LIST } from './modules'

/** Страничното меню на лаптопа. На телефона се ползва долната лента. */
export function SideNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-3 px-6 pt-7 pb-6">
        <AppMark className="size-10" />
        <div>
          <p className="text-lg font-semibold tracking-tight">AYE</p>
          <p className="text-xs text-muted">ДЗИ по БЕЛ · C1 Advanced</p>
        </div>
      </div>
      <nav aria-label="Основна навигация" className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="space-y-1">
          {MODULE_LIST.map(({ id, path, title, icon: Icon }) => (
            <li key={id}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent-soft font-semibold text-accent-strong'
                      : 'text-muted hover:bg-surface-2 hover:text-text'
                  }`
                }
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                {title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
