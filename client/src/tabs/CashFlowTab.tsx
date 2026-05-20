import { useSummary } from '../hooks/useSummary'
import { useBalanceSeries, useIncomeExpenseBar, useStackedExpenses, useCategoryDonut } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { CashFlowKPIs } from '../components/web/CashFlowKPIs'
import { BalanceChart } from '../components/web/BalanceChart'
import { CategoryStackedBar } from '../components/web/CategoryStackedBar'
import { CategoryDonut } from '../components/web/CategoryDonut'
import { CashFlowStatement } from '../components/web/CashFlowStatement'
import type { Span } from '../components/web/BalanceChart'

const SPAN_MONTHS: Record<Span, number> = { '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }

interface Props { month: string; span: Span; onSpanChange: (s: Span) => void }

export function CashFlowTab({ month, span, onSpanChange }: Props) {
  const months = prevMonths(SPAN_MONTHS[span], month)
  const prevMonth = prevMonths(2, month)[0]

  const { data: summary } = useSummary(month)
  const { data: prevSummary } = useSummary(prevMonth)
  const { data: balance } = useBalanceSeries(months)
  const { data: bar } = useIncomeExpenseBar(months)
  const { data: stackedExp } = useStackedExpenses(months)
  const { data: donut } = useCategoryDonut(month)

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {summary && <CashFlowKPIs summary={summary} barData={bar} />}
      {balance && <BalanceChart data={balance} span={span} onSpanChange={onSpanChange} />}
      {stackedExp && <CategoryStackedBar data={stackedExp} />}
      <div className="grid grid-cols-2 gap-6">
        {donut && <CategoryDonut data={donut} />}
        {summary && <CashFlowStatement summary={summary} prevEndBalance={prevSummary?.endBalance} />}
      </div>
      {!summary && !balance && (
        <p className="text-sm text-gray-400 text-center py-12">No data yet</p>
      )}
    </div>
  )
}
