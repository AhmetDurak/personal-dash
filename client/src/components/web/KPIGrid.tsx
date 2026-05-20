import { formatEur } from '../../utils/format'
import type { MonthSummary, BarDataset } from '../../types'

interface Props { summary: MonthSummary; barData?: BarDataset }

function avg(arr: number[]) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

const CARDS = (s: MonthSummary) => [
  { label: 'Total Income',     value: formatEur(s.income),                       color: '#00B087', textColor: 'text-xero-green',   avgKey: 'income'   as const },
  { label: 'Total Expenses',   value: formatEur(s.totalExpenses),                color: '#F59E0B', textColor: 'text-amber-500',    avgKey: 'expenses' as const },
  { label: 'Net Savings',      value: formatEur(s.net),                          color: s.net >= 0 ? '#00B087' : '#EF4444', textColor: s.net >= 0 ? 'text-xero-green' : 'text-red-500', avgKey: 'net' as const },
  { label: 'Savings Rate',     value: `${(s.savingsRate * 100).toFixed(1)}%`,    color: '#0EA5E9', textColor: 'text-sky-500',      avgKey: null },
  { label: 'Investment',       value: formatEur(s.byCategory.Investment ?? 0),   color: '#8B5CF6', textColor: 'text-violet-500',   avgKey: null },
  { label: 'Investments YTD',  value: formatEur(s.investmentsYTD),               color: '#64748B', textColor: 'text-slate-500',    avgKey: null },
]

export function KPIGrid({ summary, barData }: Props) {
  const avgIncome   = barData ? avg(barData.income)   : null
  const avgExpenses = barData ? avg(barData.expenses) : null
  const avgNet      = barData ? avg(barData.income.map((inc, i) => inc - barData.expenses[i])) : null
  const n           = barData?.labels.length ?? 0

  function getAvg(key: 'income' | 'expenses' | 'net' | null) {
    if (!key || !barData) return null
    const val = key === 'income' ? avgIncome : key === 'expenses' ? avgExpenses : avgNet
    return val
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {CARDS(summary).map(c => {
        const avgVal = getAvg(c.avgKey as 'income' | 'expenses' | 'net' | null)
        return (
          <div key={c.label} className="bg-white rounded-xl shadow-sm overflow-hidden border border-xero-border">
            <div className="h-1" style={{ backgroundColor: c.color }} />
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{c.label}</p>
              <p className={`text-2xl font-bold ${c.textColor}`}>{c.value}</p>
              {avgVal !== null && (
                <p className="text-xs text-gray-400 mt-1">
                  Ø {formatEur(Math.round(avgVal * 100))} <span className="text-gray-300">/mo · {n}mo avg</span>
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
