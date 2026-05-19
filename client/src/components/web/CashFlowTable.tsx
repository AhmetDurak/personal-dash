import { formatEur } from '../../utils/format'
import { CAT_COLORS } from '../../constants/categories'
import { EXPENSE_CATS } from '../../types'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary }

export function CashFlowTable({ summary }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border overflow-hidden">
      <div className="px-6 py-4 border-b border-xero-border">
        <h2 className="text-base font-semibold text-gray-800">Cash Flow</h2>
      </div>
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-xero-bg text-xs uppercase tracking-wide text-gray-500">
            <th className="text-left px-6 py-2.5 font-medium w-1/2">Category</th>
            <th className="text-right px-6 py-2.5 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-xero-border">
          <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-3 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS.Income }} />
              <span className="font-medium text-gray-800">Income</span>
            </td>
            <td className="px-6 py-3 text-right font-semibold text-xero-green">{formatEur(summary.income)}</td>
          </tr>
          {EXPENSE_CATS.map(cat => {
            const amount = summary.byCategory[cat] ?? 0
            if (!amount) return null
            return (
              <tr key={cat} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[cat] }} />
                  <span className="text-gray-700">{cat}</span>
                </td>
                <td className="px-6 py-3 text-right text-gray-700">{formatEur(amount)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-xero-bg border-t-2 border-xero-border">
            <td className="px-6 py-3 font-semibold text-gray-800">Net</td>
            <td className={`px-6 py-3 text-right font-bold text-base ${summary.net >= 0 ? 'text-xero-green' : 'text-red-500'}`}>
              {formatEur(summary.net)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
