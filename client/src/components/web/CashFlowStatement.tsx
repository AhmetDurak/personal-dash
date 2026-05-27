import { formatEur } from '../../utils/format'
import { CAT_COLORS } from '../../constants/categories'
import { EXPENSE_CATS } from '../../types'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary; prevEndBalance?: number }

export function CashFlowStatement({ summary, prevEndBalance = 0 }: Props) {
  const closingBalance = prevEndBalance + summary.net

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-xero-border">
        <h2 className="text-base font-semibold text-gray-800">Cash Flow Statement</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="bg-xero-bg text-xs uppercase tracking-wide text-gray-500 border-b border-xero-border">
              <th className="text-left px-4 md:px-6 py-2.5 font-medium">Category</th>
              <th className="text-right px-3 md:px-4 py-2.5 font-medium">Cash In</th>
              <th className="text-right px-3 md:px-4 py-2.5 font-medium">Cash Out</th>
              <th className="text-right px-4 md:px-6 py-2.5 font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-xero-border">
            <tr className="bg-xero-bg/50">
              <td className="px-4 md:px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={4}>Income</td>
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-4 md:px-6 py-3 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS.Income }} />
                <span className="font-medium text-gray-800">Total Income</span>
              </td>
              <td className="px-3 md:px-4 py-3 text-right text-xero-green font-semibold">{formatEur(summary.income)}</td>
              <td className="px-3 md:px-4 py-3 text-right text-gray-400">—</td>
              <td className="px-4 md:px-6 py-3 text-right text-xero-green font-semibold">{formatEur(summary.income)}</td>
            </tr>
            <tr className="bg-xero-bg/50">
              <td className="px-4 md:px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={4}>Expenses</td>
            </tr>
            {EXPENSE_CATS.map(cat => {
              const amount = summary.byCategory[cat] ?? 0
              if (!amount) return null
              return (
                <tr key={cat} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-3 flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[cat] }} />
                    <span className="text-gray-700">{cat}</span>
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right text-gray-400">—</td>
                  <td className="px-3 md:px-4 py-3 text-right text-gray-700">{formatEur(amount)}</td>
                  <td className="px-4 md:px-6 py-3 text-right text-gray-700">-{formatEur(amount)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-xero-border">
            <tr className="bg-xero-bg">
              <td className="px-4 md:px-6 py-3 font-semibold text-gray-800">Opening Balance</td>
              <td className="px-3 md:px-4 py-3" />
              <td className="px-3 md:px-4 py-3" />
              <td className="px-4 md:px-6 py-3 text-right font-semibold text-gray-700">{formatEur(prevEndBalance)}</td>
            </tr>
            <tr className="bg-xero-bg">
              <td className="px-4 md:px-6 py-3 font-bold text-gray-800">Net</td>
              <td className="px-3 md:px-4 py-3 text-right font-bold text-xero-green">{formatEur(summary.income)}</td>
              <td className="px-3 md:px-4 py-3 text-right font-bold text-red-500">{formatEur(summary.totalExpenses)}</td>
              <td className={`px-4 md:px-6 py-3 text-right font-bold text-base ${summary.net >= 0 ? 'text-xero-green' : 'text-red-500'}`}>{formatEur(summary.net)}</td>
            </tr>
            <tr className="bg-xero-bg">
              <td className="px-4 md:px-6 py-3 font-bold text-gray-900">Closing Balance</td>
              <td className="px-3 md:px-4 py-3" />
              <td className="px-3 md:px-4 py-3" />
              <td className={`px-4 md:px-6 py-3 text-right font-bold text-base ${closingBalance >= 0 ? 'text-xero-green' : 'text-red-500'}`}>{formatEur(closingBalance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
