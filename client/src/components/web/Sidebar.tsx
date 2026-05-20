import { NavLink } from 'react-router-dom'

const NAV = [
  { path: '/overview',     label: 'Profit & Loss',   icon: '⊞' },
  { path: '/cashflow',     label: 'Cash Flow',        icon: '⇌' },
  { path: '/simplified',   label: 'Simplified',       icon: '≡' },
  { path: '/transactions', label: 'Transactions',     icon: '↕' },
  { path: '/etf',          label: 'ETF Monitor',      icon: '◈' },
  { path: '/news',         label: 'News Feed',        icon: '📰' },
  { path: '/learn',        label: 'Finance Academy',  icon: '🎓' },
]

interface Props { dark: boolean; onToggleDark: () => void }

export function Sidebar({ dark, onToggleDark }: Props) {
  return (
    <aside className="w-[220px] h-full bg-xero-navy flex flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-xero-navy-light">
        <p className="text-white font-bold text-lg tracking-tight">Finance</p>
        <p className="text-xero-green text-xs font-medium mt-0.5">Dashboard</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors text-left border-l-[3px] ${
                isActive
                  ? 'border-xero-green text-xero-green bg-xero-navy-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-xero-navy-light">
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light transition-colors text-sm"
        >
          <span className="text-base">{dark ? '☀️' : '🌙'}</span>
          <span className="font-medium">{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  )
}
