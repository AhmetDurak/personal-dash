import { formatEur } from '../../utils/format'
import { CAT_ICONS, CAT_COLORS } from '../../constants/categories'
import { EXPENSE_CATS } from '../../types'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary }

export function CashFlowTable({ summary }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2 font-medium text-gray-600 w-1/2">Category</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100 bg-green-50">
            <td className="px-4 py-2 flex items-center gap-2">
              <span>{CAT_ICONS.Income}</span>
              <span className="font-medium" style={{ color: CAT_COLORS.Income }}>Income</span>
            </td>
            <td className="px-4 py-2 text-right font-medium text-green-600">
              {formatEur(summary.income)}
            </td>
          </tr>
          {EXPENSE_CATS.map(cat => {
            const amount = summary.byCategory[cat] ?? 0
            if (!amount) return null
            return (
              <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 flex items-center gap-2">
                  <span>{CAT_ICONS[cat]}</span>
                  <span style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                </td>
                <td className="px-4 py-2 text-right text-gray-700">{formatEur(amount)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
            <td className="px-4 py-2">Net</td>
            <td className={`px-4 py-2 text-right ${summary.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatEur(summary.net)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
