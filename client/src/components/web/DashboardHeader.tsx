import { MonthSelector } from './MonthSelector'

const TITLES: Record<string, string> = {
  overview:     'Profit & Loss',
  cashflow:     'Cash Flow',
  simplified:   'Simplified',
  transactions: 'Transactions',
}

interface Props {
  tab: string
  month: string
  onMonthChange: (m: string) => void
}

export function DashboardHeader({ tab, month, onMonthChange }: Props) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-xero-border">
      <h1 className="text-xl font-semibold text-gray-900">{TITLES[tab] ?? 'Dashboard'}</h1>
      <div className="flex items-center gap-3">
        {tab !== 'transactions' && <MonthSelector month={month} onChange={onMonthChange} align="right" />}
        <span className="text-xs font-semibold px-2.5 py-1 bg-xero-green/10 text-xero-green rounded-full">PSD2</span>
      </div>
    </header>
  )
}
