import { createPortal } from 'react-dom'
import { useState } from 'react'
import { EXPENSE_CATS } from '../../types'
import type { Category, TxType } from '../../types'

interface Form {
  type: TxType
  name: string
  amount: string
  date: string
  category: Category
}

interface Props {
  month: string
  onClose: () => void
  onSaved: () => void
}

function validate(f: Form): string | null {
  if (!f.name.trim()) return 'Name required'
  if (!f.amount || isNaN(Number(f.amount)) || Number(f.amount) <= 0) return 'Valid amount required'
  return null
}

export function AddEntryModal({ month, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Form>({
    type: 'expense',
    name: '',
    amount: '',
    date: `${month}-01`,
    category: 'Others',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(form)
    if (err) { setError(err); return }
    setSaving(true)
    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Math.round(Number(form.amount) * 100),
        }),
      })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const categories = form.type === 'income' ? (['Income'] as Category[]) : EXPENSE_CATS

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Add Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {(['expense', 'income'] as TxType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set({ type: t, category: t === 'income' ? 'Income' : 'Others' })}
                className={`flex-1 py-1.5 text-sm rounded capitalize ${form.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Description"
            value={form.name}
            onChange={e => set({ name: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Amount (€)"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => set({ amount: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            type="date"
            value={form.date}
            onChange={e => set({ date: e.target.value })}
          />
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            value={form.category}
            onChange={e => set({ category: e.target.value as Category })}
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm rounded bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
