import { formatEur } from '../../utils/format'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary }

export function KPIGrid({ summary }: Props) {
  const cards = [
    { label: 'Income', value: formatEur(summary.income), color: 'text-green-600' },
    { label: 'Expenses', value: formatEur(summary.totalExpenses), color: 'text-red-500' },
    { label: 'Net', value: formatEur(summary.net), color: summary.net >= 0 ? 'text-green-600' : 'text-red-500' },
    { label: 'Balance', value: formatEur(summary.endBalance), color: 'text-gray-900' },
    { label: 'Investments', value: formatEur(summary.byCategory.Investment ?? 0), color: 'text-indigo-600' },
    { label: 'YTD Investments', value: formatEur(summary.investmentsYTD), color: 'text-indigo-400' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p className={`text-lg font-semibold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}
