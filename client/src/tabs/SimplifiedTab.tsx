import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useSummary } from '../hooks/useSummary'
import { useBalanceSeries, useCategoryDonut, useIncomeExpenseBar } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { KPIGrid } from '../components/web/KPIGrid'
import { CashFlowTable } from '../components/web/CashFlowTable'
import { BalanceChart } from '../components/web/BalanceChart'
import { CategoryDonut } from '../components/web/CategoryDonut'
import { IncomeExpenseBar } from '../components/web/IncomeExpenseBar'
import { AddEntryModal } from '../components/web/AddEntryModal'
import type { Span } from '../components/web/BalanceChart'

const SPAN_MONTHS: Record<Span, number> = { '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }

interface Props { month: string; span: Span; onSpanChange: (s: Span) => void }

export function SimplifiedTab({ month, span, onSpanChange }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: summary, isLoading } = useSummary(month)
  const months = prevMonths(SPAN_MONTHS[span], month)
  const { data: series } = useBalanceSeries(months)
  const { data: donut } = useCategoryDonut(month)
  const { data: bar } = useIncomeExpenseBar(months)

  function onSaved() {
    mutate(`/api/summary/${month}`)
    mutate(`/api/transactions/${month}`)
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {isLoading || !summary
        ? <div className="text-sm text-gray-400 py-12">Loading…</div>
        : <>
            <KPIGrid summary={summary} />
            <CashFlowTable summary={summary} />
            {series && <BalanceChart data={series} span={span} onSpanChange={onSpanChange} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {donut && <CategoryDonut data={donut} />}
              {bar && <IncomeExpenseBar data={bar} />}
            </div>
          </>
      }
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-8 right-8 bg-xero-green text-white rounded-full w-12 h-12 text-2xl shadow-lg hover:bg-xero-green-dark flex items-center justify-center transition-colors"
      >+</button>
      {modal && <AddEntryModal month={month} onClose={() => setModal(false)} onSaved={onSaved} />}
    </div>
  )
}
