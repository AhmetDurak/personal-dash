import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, CalendarCheck } from 'lucide-react'
import { formatEur } from '../../utils/format'
import { useCountUp } from '../../hooks/useCountUp'
import type { MonthSummary, BarDataset } from '../../types'

interface Props { summary: MonthSummary; barData?: BarDataset }

function avg(arr: number[]) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

interface CardDef {
  label:      string
  rawValue:   number
  display:    (animated: number) => string
  color:      string
  bgColor:    string
  Icon:       React.ElementType
  avgKey:     'income' | 'expenses' | 'net' | null
}

function KPICard({ card, avgVal, n }: { card: CardDef; avgVal: number | null; n: number }) {
  const animated = useCountUp(card.rawValue)
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Subtle gradient accent line at top */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}44)` }} />

      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${card.color}18` }}
          >
            <card.Icon className="w-4 h-4" style={{ color: card.color }} strokeWidth={2} />
          </div>
        </div>

        <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 tabular-nums">
          {card.display(animated)}
        </p>

        {avgVal !== null && (
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
            <span className="font-medium text-gray-500 dark:text-slate-400">Ø {formatEur(Math.round(avgVal * 100))}</span>
            <span className="text-gray-300 dark:text-slate-600">/mo · {n}mo avg</span>
          </p>
        )}
      </div>
    </div>
  )
}

export function KPIGrid({ summary, barData }: Props) {
  const avgIncome   = barData ? avg(barData.income)   : null
  const avgExpenses = barData ? avg(barData.expenses) : null
  const avgNet      = barData ? avg(barData.income.map((inc, i) => inc - barData.expenses[i])) : null
  const n           = barData?.labels.length ?? 0

  const netColor = summary.net >= 0 ? '#00B087' : '#EF4444'

  const CARDS: CardDef[] = [
    {
      label:    'Total Income',
      rawValue: summary.income,
      display:  v => formatEur(v),
      color:    '#00B087',
      bgColor:  '#00B08718',
      Icon:     TrendingUp,
      avgKey:   'income',
    },
    {
      label:    'Total Expenses',
      rawValue: summary.totalExpenses,
      display:  v => formatEur(v),
      color:    '#F59E0B',
      bgColor:  '#F59E0B18',
      Icon:     TrendingDown,
      avgKey:   'expenses',
    },
    {
      label:    'Net Savings',
      rawValue: Math.abs(summary.net),
      display:  v => `${summary.net < 0 ? '-' : ''}${formatEur(v)}`,
      color:    netColor,
      bgColor:  `${netColor}18`,
      Icon:     Wallet,
      avgKey:   'net',
    },
    {
      label:    'Savings Rate',
      rawValue: Math.round(summary.savingsRate * 1000),
      display:  v => `${(v / 10).toFixed(1)}%`,
      color:    '#0EA5E9',
      bgColor:  '#0EA5E918',
      Icon:     PiggyBank,
      avgKey:   null,
    },
    {
      label:    'Investment',
      rawValue: summary.byCategory.Investment ?? 0,
      display:  v => formatEur(v),
      color:    '#8B5CF6',
      bgColor:  '#8B5CF618',
      Icon:     BarChart3,
      avgKey:   null,
    },
    {
      label:    'Investments YTD',
      rawValue: summary.investmentsYTD,
      display:  v => formatEur(v),
      color:    '#64748B',
      bgColor:  '#64748B18',
      Icon:     CalendarCheck,
      avgKey:   null,
    },
  ]

  function getAvg(key: CardDef['avgKey']): number | null {
    if (!key || !barData) return null
    return key === 'income' ? avgIncome : key === 'expenses' ? avgExpenses : avgNet
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {CARDS.map(card => (
        <KPICard key={card.label} card={card} avgVal={getAvg(card.avgKey)} n={n} />
      ))}
    </div>
  )
}
