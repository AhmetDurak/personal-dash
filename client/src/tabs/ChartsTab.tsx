import { useCategoryDonut, useIncomeExpenseBar, useBalanceSeries } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { CategoryDonut } from '../components/web/CategoryDonut'
import { IncomeExpenseBar } from '../components/web/IncomeExpenseBar'
import { BalanceChart } from '../components/web/BalanceChart'
import { useState } from 'react'
import type { Span } from '../components/web/BalanceChart'

const SPAN_MONTHS: Record<Span, number> = { '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }

interface Props { month: string }

export function ChartsTab({ month }: Props) {
  const [span, setSpan] = useState<Span>('6M')
  const months = prevMonths(SPAN_MONTHS[span], month)
  const { data: donut } = useCategoryDonut(month)
  const { data: bar } = useIncomeExpenseBar(months)
  const { data: balance } = useBalanceSeries(months)

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {balance && <BalanceChart data={balance} span={span} onSpanChange={setSpan} barData={bar} />}
      <div className="grid grid-cols-2 gap-6">
        {donut && <CategoryDonut data={donut} />}
        {bar && <IncomeExpenseBar data={bar} />}
      </div>
      {!donut && !bar && !balance && <p className="text-sm text-gray-400 text-center py-12">No data yet</p>}
    </div>
  )
}
