import { useCategoryDonut, useIncomeExpenseBar, useBalanceSeries } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { CategoryDonut } from '../components/web/CategoryDonut'
import { IncomeExpenseBar } from '../components/web/IncomeExpenseBar'
import { BalanceChart } from '../components/web/BalanceChart'

interface Props { month: string }

export function ChartsTab({ month }: Props) {
  const months = prevMonths(6, month)
  const { data: donut } = useCategoryDonut(month)
  const { data: bar } = useIncomeExpenseBar(months)
  const { data: balance } = useBalanceSeries(months)

  return (
    <div className="p-6 space-y-4">
      {donut && <CategoryDonut data={donut} />}
      {bar && <IncomeExpenseBar data={bar} />}
      {balance && <BalanceChart data={balance} />}
      {!donut && !bar && !balance && <p className="text-sm text-gray-400 text-center py-8">No data yet</p>}
    </div>
  )
}
