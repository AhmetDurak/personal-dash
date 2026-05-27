import { formatEur } from '../../utils/format'
import type { MonthSummary } from '../../types'
import type { BarDataset } from '../../types'

interface Props { summary: MonthSummary; barData?: BarDataset }

export function CashFlowKPIs({ summary, barData }: Props) {
  const avgMonthlySpend = barData && barData.expenses.length > 0
    ? barData.expenses.reduce((a, b) => a + b, 0) / barData.expenses.length
    : null

  const runway = avgMonthlySpend && avgMonthlySpend > 0
    ? summary.endBalance / 100 / avgMonthlySpend
    : null

  const cards = [
    { label: 'Current Balance',   value: formatEur(summary.endBalance),                                       color: '#00B087', textColor: 'text-xero-green' },
    { label: 'Avg Monthly Spend', value: avgMonthlySpend != null ? `${avgMonthlySpend.toFixed(0)} €` : '—',   color: '#F59E0B', textColor: 'text-amber-500' },
    { label: 'Savings Rate',      value: `${(summary.savingsRate * 100).toFixed(1)}%`,                         color: '#0EA5E9', textColor: 'text-sky-500' },
    { label: 'Runway',            value: runway != null ? `${runway.toFixed(1)} mo` : '—',                    color: '#8B5CF6', textColor: 'text-violet-500' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl shadow-sm overflow-hidden border border-xero-border">
          <div className="h-1" style={{ backgroundColor: c.color }} />
          <div className="px-4 py-3 md:px-5 md:py-4">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2 leading-tight">{c.label}</p>
            <p className={`text-xl md:text-2xl font-bold ${c.textColor}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
