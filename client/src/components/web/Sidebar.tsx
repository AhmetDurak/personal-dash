import { NavLink } from 'react-router-dom'

const NAV = [
  { path: '/finance/overview',     label: 'Profit & Loss',   icon: '⊞' },
  { path: '/finance/cashflow',     label: 'Cash Flow',        icon: '⇌' },
  { path: '/finance/simplified',   label: 'Simplified',       icon: '≡' },
  { path: '/finance/transactions', label: 'Transactions',     icon: '↕' },
  { path: '/finance/etf',          label: 'ETF Monitor',      icon: '◈' },
  { path: '/finance/learn',        label: 'Finance Academy',  icon: '🎓' },
]

interface Props {
  isOpen?: boolean
  onClose?: () => void
}

function NavItems({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="px-6 py-5 border-b border-xero-navy-light">
        <p className="text-white font-bold text-lg tracking-tight">Finance</p>
        <p className="text-xero-green text-xs font-medium mt-0.5">Dashboard</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
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
    </>
  )
}

export function Sidebar({ isOpen = false, onClose }: Props) {
  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden md:flex w-[220px] h-full bg-xero-navy flex-col flex-shrink-0">
        <NavItems />
      </aside>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative w-[220px] h-full bg-xero-navy flex flex-col shadow-2xl">
            <NavItems onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
