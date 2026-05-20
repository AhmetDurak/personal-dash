import { useLocation } from 'react-router-dom'
import { MonthSelector } from './MonthSelector'

const TITLES: Record<string, string> = {
  overview:     'Profit & Loss',
  cashflow:     'Cash Flow',
  simplified:   'Simplified',
  transactions: 'Transactions',
  etf:          'ETF Monitor',
  learn:        'Finance Academy',
}

const NO_MONTH = new Set(['transactions', 'etf', 'learn'])

interface Props {
  month: string
  onMonthChange: (m: string) => void
  onMenuClick: () => void
}

export function DashboardHeader({ month, onMonthChange, onMenuClick }: Props) {
  const { pathname } = useLocation()
  const page = pathname.split('/').pop() || 'overview'

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-xero-border flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect y="3"  width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="8"  width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="13" width="18" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">{TITLES[page] ?? 'Dashboard'}</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {!NO_MONTH.has(page) && <MonthSelector month={month} onChange={onMonthChange} align="right" />}
        <span className="text-xs font-semibold px-2.5 py-1 bg-xero-green/10 text-xero-green rounded-full">PSD2</span>
      </div>
    </header>
  )
}
