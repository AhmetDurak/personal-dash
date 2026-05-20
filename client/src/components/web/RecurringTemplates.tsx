import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useTemplates, createTemplate, deleteTemplate } from '../../hooks/useTemplates'
import { ConfirmDialog } from './ConfirmDialog'
import { formatEur } from '../../utils/format'
import { EXPENSE_CATS, INCOME_CATS } from '../../types'
import type { Category } from '../../types'

interface Props { month: string }

export function RecurringTemplates({ month }: Props) {
  const { data: templates, mutate } = useTemplates()
  const { mutate: globalMutate } = useSWRConfig()
  const [adding, setAdding] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [applying, setApplying] = useState<number | null>(null)
  const [draft, setDraft] = useState({ name: '', amount: '', type: 'expense' as 'income' | 'expense', category: 'Fixed' as Category })

  async function handleApply(t: { id: number; name: string; amount: number; type: string; category: string }) {
    setApplying(t.id)
    const today = new Date().toISOString().slice(0, 10)
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name, amount: t.amount, type: t.type, category: t.category, date: today, skipDuplicate: true }),
    })
    globalMutate(`/api/transactions/${month}`)
    globalMutate(`/api/summary/${month}`)
    setApplying(null)
  }

  async function handleAdd() {
    if (!draft.name || !draft.amount) return
    await createTemplate({ ...draft, amount: Math.round(parseFloat(draft.amount) * 100) })
    await mutate()
    setAdding(false)
    setDraft({ name: '', amount: '', type: 'expense', category: 'Fixed' })
  }

  async function handleDelete(id: number) {
    await deleteTemplate(id)
    await mutate()
    setConfirmId(null)
  }

  const cats = draft.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div className="bg-white rounded-xl border border-xero-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Recurring Templates</h2>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-xs text-xero-green font-semibold hover:underline"
        >+ New template</button>
      </div>

      {adding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-xero-border space-y-2">
          <input
            autoFocus
            placeholder="Name (e.g. Rent)"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="w-full text-sm border border-xero-border rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount €"
              value={draft.amount}
              onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              className="flex-1 text-sm border border-xero-border rounded-lg px-3 py-2"
              min="0" step="0.01"
            />
            <select
              value={draft.type}
              onChange={e => setDraft(d => ({ ...d, type: e.target.value as 'income' | 'expense', category: e.target.value === 'income' ? 'Income' : 'Fixed' }))}
              className="text-sm border border-xero-border rounded-lg px-2 py-2"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <select
            value={draft.category}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value as Category }))}
            className="w-full text-sm border border-xero-border rounded-lg px-3 py-2"
          >
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleAdd} className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-xero-green-dark">Save template</button>
          </div>
        </div>
      )}

      {!templates?.length && !adding && (
        <p className="text-sm text-gray-400 text-center py-4">No templates yet. Add recurring items like rent, salary, or subscriptions.</p>
      )}

      <div className="space-y-2">
        {templates?.map(t => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {t.type === 'income' ? '+' : '−'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                <p className="text-xs text-gray-400">{t.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">{formatEur(t.amount)}</span>
              <button
                onClick={() => handleApply(t)}
                disabled={applying === t.id}
                className="text-xs bg-xero-green/10 text-xero-green font-semibold px-2.5 py-1 rounded-lg hover:bg-xero-green/20 transition-colors disabled:opacity-50"
              >{applying === t.id ? '…' : '▶ Apply'}</button>
              <button onClick={() => setConfirmId(t.id)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
            </div>
          </div>
        ))}
      </div>

      {confirmId !== null && (
        <ConfirmDialog
          message="Delete this recurring template?"
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
