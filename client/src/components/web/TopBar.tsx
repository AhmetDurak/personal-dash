import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../../hooks/useDarkMode'
import { NotificationsPanel } from './NotificationsPanel'

const APPS = [
  { to: () => '/finance/overview',                                                    label: 'Finance Dashboard', isActive: (p: string) => p.startsWith('/finance') },
  { to: () => localStorage.getItem('notebook:lastPath') ?? '/notebook/notes',         label: 'My Notebook',       isActive: (p: string) => p.startsWith('/notebook') },
  { to: () => '/news',                                                                label: 'News Feed',         isActive: (p: string) => p.startsWith('/news') },
]

export function TopBar() {
  const { pathname } = useLocation()
  const { dark, toggle } = useDarkMode()

  return (
    <div className="h-10 bg-gray-950 flex items-center px-4 gap-1 flex-shrink-0 border-b border-gray-800">
      {APPS.map(app => {
        const active = app.isActive(pathname)
        const href   = app.to()
        return (
          <Link
            key={app.label}
            to={href}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {app.label}
          </Link>
        )
      })}
      <div className="ml-auto flex items-center gap-1">
        <NotificationsPanel />
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-sm text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <span>{dark ? '☀️' : '🌙'}</span>
          <span className="font-medium">{dark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </div>
  )
}
