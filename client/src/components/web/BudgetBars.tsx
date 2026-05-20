import { useState } from 'react'
import { useBudgets, setBudget, deleteBudget } from '../../hooks/useBudgets'
import { CAT_COLORS } from '../../constants/categories'
import { EXPENSE_CATS } from '../../types'
import { formatEur } from '../../utils/format'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary }

export function BudgetBars({ summary }: Props) {
  const { data: budgets, mutate } = useBudgets()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  if (!budgets) return null

  const budgetMap = Object.fromEntries(budgets.map(b => [b.category, b.amount]))

  async function save(cat: string) {
    const cents = Math.round(parseFloat(draft) * 100)
    if (!isNaN(cents) && cents > 0) await setBudget(cat, cents)
    await mutate()
    setEditing(null)
  }

  async function remove(cat: string) {
    await deleteBudget(cat)
    await mutate()
  }

  const catsWithBudget = EXPENSE_CATS.filter(c => budgetMap[c] || editing === c)
  const catsWithout = EXPENSE_CATS.filter(c => !budgetMap[c] && editing !== c)

  return (
    <div className="bg-white rounded-xl border border-xero-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Budget</h2>
        {catsWithout.length > 0 && (
          <select
            className="text-xs border border-xero-border rounded-lg px-2 py-1 text-gray-600"
            value=""
            onChange={e => { setEditing(e.target.value); setDraft('') }}
          >
            <option value="">+ Add limit…</option>
            {catsWithout.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {catsWithBudget.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No budget limits set. Use "+ Add limit" to set a monthly cap per category.</p>
      )}

      <div className="space-y-3">
        {catsWithBudget.map(cat => {
          const spent = summary.byCategory[cat as keyof typeof summary.byCategory] ?? 0
          const limit = budgetMap[cat] ?? 0
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
          const over = limit > 0 && spent > limit
          const color = CAT_COLORS[cat as keyof typeof CAT_COLORS] ?? '#6B7280'

          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                  {over && <span className="text-xs font-semibold text-red-500">Over budget</span>}
                </div>
                <div className="flex items-center gap-2">
                  {editing === cat ? (
                    <>
                      <span className="text-xs text-gray-400">€</span>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="10"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(cat); if (e.key === 'Escape') setEditing(null) }}
                        className="w-20 text-xs border border-xero-border rounded px-2 py-0.5 text-right"
                        placeholder="0.00"
                      />
                      <button onClick={() => save(cat)} className="text-xs text-xero-green font-semibold hover:underline">Save</button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className={`text-xs ${over ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                        {formatEur(spent)} / {formatEur(limit)}
                      </span>
                      <button onClick={() => { setEditing(cat); setDraft((limit / 100).toFixed(2)) }} className="text-xs text-gray-400 hover:text-gray-700">✎</button>
                      <button onClick={() => remove(cat)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
                    </>
                  )}
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${pct}%`, backgroundColor: over ? undefined : color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
