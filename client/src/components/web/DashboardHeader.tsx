import { useLocation } from 'react-router-dom'
import { MonthSelector } from './MonthSelector'
import { IconMenu } from '../../lib/icons'

const TITLES: Record<string, string> = {
  overview:     'Profit & Loss',
  cashflow:     'Cash Flow',
  simplified:   'Simplified',
  transactions: 'Transactions',
  etf:          'ETF Monitor',
  'savings-plan': 'Savings Plan',
  learn:        'Finance Academy',
}

const NO_MONTH = new Set(['etf', 'savings-plan', 'learn'])

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
          <IconMenu className="w-5 h-5" strokeWidth={2} />
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
