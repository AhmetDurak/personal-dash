import { NavLink } from 'react-router-dom'
import {
  IconDashboard    as LayoutDashboard,
  IconTransfer     as ArrowLeftRight,
  IconList         as AlignJustify,
  IconSort         as ArrowUpDown,
  IconIncome       as TrendingUp,
  IconGraduation   as GraduationCap,
} from '../../lib/icons'

const NAV = [
  { path: '/finance/overview',     label: 'Profit & Loss',   Icon: LayoutDashboard },
  { path: '/finance/cashflow',     label: 'Cash Flow',       Icon: ArrowLeftRight },
  { path: '/finance/simplified',   label: 'Simplified',      Icon: AlignJustify },
  { path: '/finance/transactions', label: 'Transactions',    Icon: ArrowUpDown },
  { path: '/finance/etf',          label: 'ETF Monitor',     Icon: TrendingUp },
  { path: '/finance/learn',        label: 'Finance Academy', Icon: GraduationCap },
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
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all text-left border-l-2 group ${
                isActive
                  ? 'border-xero-green text-xero-green bg-xero-navy-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-xero-green' : 'text-gray-500 group-hover:text-gray-300'}`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span className="font-medium">{item.label}</span>
              </>
            )}
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
