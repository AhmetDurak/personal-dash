import { useLocation } from 'react-router-dom'
import { MonthSelector } from './MonthSelector'
import { NotificationsPanel } from './NotificationsPanel'

const TITLES: Record<string, string> = {
  overview:     'Profit & Loss',
  cashflow:     'Cash Flow',
  simplified:   'Simplified',
  transactions: 'Transactions',
  etf:          'ETF Monitor',
  news:         'News Feed',
  learn:        'Finance Academy',
}

const NO_MONTH = new Set(['transactions', 'etf', 'news', 'learn'])

interface Props {
  month: string
  onMonthChange: (m: string) => void
}

export function DashboardHeader({ month, onMonthChange }: Props) {
  const { pathname } = useLocation()
  const page = pathname.slice(1) || 'overview'

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
      <h1 className="text-xl font-semibold text-gray-900">{TITLES[page] ?? 'Dashboard'}</h1>
      <div className="flex items-center gap-3">
        {!NO_MONTH.has(page) && <MonthSelector month={month} onChange={onMonthChange} align="right" />}
        <span className="text-xs font-semibold px-2.5 py-1 bg-xero-green/10 text-xero-green rounded-full">PSD2</span>
        <NotificationsPanel />
      </div>
    </header>
  )
}
