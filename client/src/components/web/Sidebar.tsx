import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  IconSort        as ArrowUpDown,
  IconTransfer    as ArrowLeftRight,
  IconDashboard   as LayoutDashboard,
  IconIncome      as TrendingUp,
  IconGraduation  as GraduationCap,
  IconSavings     as PiggyBank,
  IconChevronLeft,
  IconChevronRight,
} from '../../lib/icons'

const NAV = [
  { path: '/finance/transactions',  label: 'Transactions',    Icon: ArrowUpDown },
  { path: '/finance/cashflow',      label: 'Cash Flow',       Icon: ArrowLeftRight },
  { path: '/finance/overview',      label: 'Profit & Loss',   Icon: LayoutDashboard },
  { path: '/finance/etf',           label: 'ETF Monitor',     Icon: TrendingUp },
  { path: '/finance/savings-plan',  label: 'Savings Plan',    Icon: PiggyBank },
  { path: '/finance/learn',         label: 'Finance Academy', Icon: GraduationCap },
]

const COLLAPSE_KEY = 'sidebar:collapsed:/finance'

interface Props {
  isOpen?: boolean
  onClose?: () => void
}

function NavItems({ onClose, collapsed }: { onClose?: () => void; collapsed?: boolean }) {
  const [hovered, setHovered] = useState<{ label: string; top: number } | null>(null)

  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => { setHovered(null); onClose?.() }}
          onMouseEnter={collapsed ? e => {
            const rect = e.currentTarget.getBoundingClientRect()
            setHovered({ label: item.label, top: rect.top + rect.height / 2 })
          } : undefined}
          onMouseLeave={collapsed ? () => setHovered(null) : undefined}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 text-sm transition-all text-left border-l-2 group ${
              collapsed ? 'justify-center px-0 py-3.5' : 'px-5 py-2.5'
            } ${
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
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
      {collapsed && hovered && (
        <div
          className="fixed z-50 ml-3 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none"
          style={{ top: hovered.top, left: '3.5rem' }}
        >
          {hovered.label}
        </div>
      )}
    </nav>
  )
}

export function Sidebar({ isOpen = false, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
  }

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      <aside
        className={`hidden md:flex h-full bg-xero-navy flex-col flex-shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-14' : 'w-[220px]'
        }`}
      >
        <div className={`border-b border-xero-navy-light flex-shrink-0 ${collapsed ? 'py-5 flex justify-center' : 'px-6 py-5'}`}>
          {collapsed
            ? <span className="text-xero-green font-bold text-sm">•••</span>
            : <>
                <p className="text-white font-bold text-lg tracking-tight">Finance</p>
                <p className="text-xero-green text-xs font-medium mt-0.5">Dashboard</p>
              </>
          }
        </div>
        <NavItems collapsed={collapsed} />
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center py-3 border-t border-xero-navy-light text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <IconChevronRight className="w-4 h-4" strokeWidth={2} />
            : <IconChevronLeft  className="w-4 h-4" strokeWidth={2} />
          }
        </button>
      </aside>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative w-[220px] h-full bg-xero-navy flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-xero-navy-light">
              <p className="text-white font-bold text-lg tracking-tight">Finance</p>
              <p className="text-xero-green text-xs font-medium mt-0.5">Dashboard</p>
            </div>
            <NavItems onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
