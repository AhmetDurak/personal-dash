import { NavLink } from 'react-router-dom'

const NAV = [
  { path: '/finance/overview',     label: 'Profit & Loss',   icon: '⊞' },
  { path: '/finance/cashflow',     label: 'Cash Flow',        icon: '⇌' },
  { path: '/finance/simplified',   label: 'Simplified',       icon: '≡' },
  { path: '/finance/transactions', label: 'Transactions',     icon: '↕' },
  { path: '/finance/etf',          label: 'ETF Monitor',      icon: '◈' },
  { path: '/finance/learn',        label: 'Finance Academy',  icon: '🎓' },
]

export function Sidebar() {
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
    </aside>
  )
}
