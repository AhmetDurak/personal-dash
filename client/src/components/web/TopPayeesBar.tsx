import { formatEur } from '../../utils/format'
import type { TopPayee } from '../../types'

interface Props { data: TopPayee[] }

export function TopPayeesBar({ data }: Props) {
  if (!data.length) return null

  const max = Math.max(...data.map(p => p.total))

  const BAR_COLORS = ['#F59E0B', '#FBB040', '#FBB040', '#FCD27A', '#FCD27A',
                      '#FDE9A0', '#FDE9A0', '#FDE9A0', '#FDE9A0', '#FDE9A0']

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-xero-border dark:border-slate-700 p-4 md:p-6">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-4">Top Payees</h2>

      <div className="space-y-3">
        {data.map((payee, i) => {
          const pct = (payee.total / max) * 100
          const color = BAR_COLORS[i] ?? '#FDE9A0'

          return (
            <div key={payee.name} className="flex items-center gap-2 min-w-0">
              {/* Name — fixed width, truncated */}
              <p
                className="text-xs text-gray-600 dark:text-slate-400 truncate flex-shrink-0"
                style={{ width: '35%', minWidth: 60 }}
                title={payee.name}
              >
                {payee.name}
              </p>

              {/* Bar — grows to fill remaining space */}
              <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-700 rounded-r-full overflow-hidden min-w-0">
                <div
                  className="h-full rounded-r-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>

              {/* Amount — always visible, never truncated */}
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 tabular-nums flex-shrink-0 text-right" style={{ minWidth: 60 }}>
                {formatEur(payee.total)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
