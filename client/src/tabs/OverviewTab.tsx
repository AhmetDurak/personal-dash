import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useSummary } from '../hooks/useSummary'
import { useIncomeExpenseBar, useCategoryDonut, useStackedExpenses, useStackedIncome, useTopPayees } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { KPIGrid } from '../components/web/KPIGrid'
import { IncomeExpenseCombo } from '../components/web/IncomeExpenseCombo'
import { NetSavingsLine } from '../components/web/NetSavingsLine'
import { CategoryDonut } from '../components/web/CategoryDonut'
import { CategoryStackedBar } from '../components/web/CategoryStackedBar'
import { IncomeStackedBar } from '../components/web/IncomeStackedBar'
import { SavingsRateLine } from '../components/web/SavingsRateLine'
import { CategoryTrendLines } from '../components/web/CategoryTrendLines'
import { TopPayeesBar } from '../components/web/TopPayeesBar'
import { AddEntryModal } from '../components/web/AddEntryModal'
import type { Span } from '../components/web/BalanceChart'

const SPAN_MONTHS: Record<Span, number> = { '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }

interface Props { month: string; span: Span; onSpanChange: (s: Span) => void }

export function OverviewTab({ month, span, onSpanChange }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: summary, isLoading } = useSummary(month)

  const months12 = prevMonths(SPAN_MONTHS[span], month)
  const prevMonth = prevMonths(2, month)[0]   // [0] = one month before `month`
  const { data: bar } = useIncomeExpenseBar(months12)
  const { data: donutCurrent } = useCategoryDonut(month)
  const { data: donutPrev } = useCategoryDonut(prevMonth)
  const { data: stackedExp } = useStackedExpenses(months12)
  const { data: stackedInc } = useStackedIncome(months12)
  const { data: topPayees } = useTopPayees(month)

  function onSaved() {
    mutate(`/api/summary/${month}`)
    mutate(`/api/transactions/${month}`)
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {isLoading || !summary
        ? <div className="text-sm text-gray-400 py-12">Loading…</div>
        : <>
            <KPIGrid summary={summary} barData={bar} />
            {bar && <IncomeExpenseCombo data={bar} span={span} onSpanChange={onSpanChange} />}
            {bar && <NetSavingsLine data={bar} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {donutCurrent && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">This Month</p>
                  <CategoryDonut data={donutCurrent} />
                </div>
              )}
              {donutPrev && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Last Month</p>
                  <CategoryDonut data={donutPrev} />
                </div>
              )}
            </div>
            {stackedExp && <CategoryStackedBar data={stackedExp} />}
            {stackedInc && <IncomeStackedBar data={stackedInc} />}
            {bar && <SavingsRateLine data={bar} />}
            {stackedExp && <CategoryTrendLines data={stackedExp} />}
            {topPayees && topPayees.length > 0 && <TopPayeesBar data={topPayees} />}
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
