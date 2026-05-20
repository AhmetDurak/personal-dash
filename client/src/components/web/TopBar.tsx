import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../../hooks/useDarkMode'
import { NotificationsPanel } from './NotificationsPanel'

const APPS = [
  { to: () => '/finance/overview',                                                    label: 'Finance Dashboard', isActive: (p: string) => p.startsWith('/finance') },
  { to: () => localStorage.getItem('notebook:lastPath') ?? '/notebook/notes',         label: 'My Notebook',       isActive: (p: string) => p.startsWith('/notebook') },
  { to: () => '/news',                                                                label: 'News Feed',         isActive: (p: string) => p.startsWith('/news') },
]

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1" y="1"  width="8" height="8" rx="1.5" fill="#13B5EA" />
      <rect x="11" y="1"  width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="1"  y="11" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="11" y="11" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
    </svg>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const { dark, toggle } = useDarkMode()

  return (
    <div className="h-10 bg-gray-950 flex items-center px-4 gap-1 flex-shrink-0 border-b border-gray-800">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r border-gray-800 flex-shrink-0">
        <Logo />
        <span className="text-sm font-semibold text-white tracking-tight">Personal Dashboard</span>
      </div>

      {/* App switcher */}
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

      {/* Right side */}
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
