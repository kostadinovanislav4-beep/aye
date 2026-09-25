import { Ellipsis, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { PRIMARY_MODULES, SECONDARY_MODULES } from './modules'

type NavItemProps = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Показва елемента като активен, въпреки че адресът е друг (за „Още“). */
  highlight?: boolean
}

function NavItem({ to, label, icon: Icon, end = false, highlight = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 pt-1 pb-1.5"
    >
      {({ isActive }) => {
        const active = isActive || highlight
        return (
          <>
            <span
              className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                active ? 'bg-accent text-on-accent' : 'text-muted'
              }`}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
            </span>
            <span
              className={`text-[0.7rem] leading-none ${active ? 'font-semibold text-text' : 'text-muted'}`}
            >
              {label}
            </span>
          </>
        )
      }}
    </NavLink>
  )
}

/** Долната лента на телефона. На лаптопа се ползва страничното меню. */
export function BottomNav() {
  const { pathname } = useLocation()
  const inMore =
    pathname === '/more' || SECONDARY_MODULES.some((module) => pathname.startsWith(module.path))

  return (
    <nav
      aria-label="Основна навигация"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {PRIMARY_MODULES.map((module) => (
          <li key={module.id}>
            <NavItem
              to={module.path}
              label={module.navLabel}
              icon={module.icon}
              end={module.path === '/'}
            />
          </li>
        ))}
        <li>
          <NavItem to="/more" label="Още" icon={Ellipsis} highlight={inMore} />
        </li>
      </ul>
    </nav>
  )
}
