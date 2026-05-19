import { createPortal } from 'react-dom'
import { useState } from 'react'
import { EXPENSE_CATS, INCOME_CATS } from '../../types'
import { formatEur, formatDate } from '../../utils/format'
import type { Category, TxType, Transaction } from '../../types'

const REPEAT_OPTIONS = [
  { label: 'Once', value: 0 },
  { label: '1M',   value: 1 },
  { label: '3M',   value: 3 },
  { label: '6M',   value: 6 },
  { label: '12M',  value: 12 },
]

interface Form { type: TxType; name: string; amount: string; date: string; category: Category; repeat: number; repeatCount: number }
interface Props { month: string; onClose: () => void; onSaved: () => void; transaction?: Transaction }
interface ConfirmState { name: string; category: Category }

function validate(f: Form): string | null {
  if (!f.name.trim()) return 'Name required'
  if (!f.amount || isNaN(Number(f.amount)) || Number(f.amount) <= 0) return 'Valid amount required'
  return null
}

const pillBtn = (active: boolean) =>
  `flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${active ? 'bg-white text-xero-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`

export function AddEntryModal({ month, onClose, onSaved, transaction }: Props) {
  const [form, setForm] = useState<Form>(transaction ? {
    type: transaction.type,
    name: transaction.name,
    amount: (transaction.amount / 100).toString(),
    date: transaction.date,
    category: transaction.category,
    repeat: 0,
    repeatCount: 12,
  } : { type: 'expense', name: '', amount: '', date: `${month}-01`, category: 'Others' as Category, repeat: 0, repeatCount: 12 })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<number | null>(null)
  const [duplicate, setDuplicate] = useState<Transaction | null>(null)

  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(form)
    if (err) { setError(err); return }
    setSaving(true)
    try {
      const url = transaction ? `/api/entries/${transaction.id}` : '/api/entries'
      const method = transaction ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = { ...form, amount: Math.round(Number(form.amount) * 100) }
      if (transaction || form.repeat === 0) {
        delete body.repeat
        delete body.repeatCount
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!transaction && res.status === 409) {
        const data = await res.json() as { conflict: Transaction }
        setDuplicate(data.conflict)
        return
      }
      onSaved()
      setConfirm({ name: form.name.trim(), category: form.category })
    } catch {
      setError('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyAll() {
    if (!confirm) return
    setApplying(true)
    const res = await fetch('/api/entries/recategorize', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: confirm.name, category: confirm.category }),
    })
    const data = await res.json() as { updated: number }
    setApplyResult(data.updated)
    setApplying(false)
    onSaved()
    setTimeout(onClose, 1200)
  }

  function handleSkip() {
    onClose()
  }

  async function handleDuplicateOverride() {
    if (!duplicate) return
    setSaving(true)
    const body: Record<string, unknown> = { ...form, amount: Math.round(Number(form.amount) * 100) }
    delete body.repeat; delete body.repeatCount
    await fetch(`/api/entries/${duplicate.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setDuplicate(null)
    onSaved()
    setConfirm({ name: form.name.trim(), category: form.category })
  }

  async function handleDuplicateKeepBoth() {
    if (!duplicate) return
    setSaving(true)
    const body: Record<string, unknown> = { ...form, amount: Math.round(Number(form.amount) * 100), skipDuplicate: true }
    delete body.repeat; delete body.repeatCount
    await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    setDuplicate(null)
    onSaved()
    setConfirm({ name: form.name.trim(), category: form.category })
  }

  const categories = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS
  const isRecurring = !transaction && form.repeat > 0
  const entryCount = isRecurring ? Math.max(1, form.repeatCount) : 1

  if (confirm) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleSkip}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-xero-border">
            <h2 className="text-lg font-semibold text-gray-900">Entry Saved</h2>
          </div>
          <div className="p-6 space-y-4">
            {applyResult !== null ? (
              <div className="flex items-center gap-3 text-xero-green">
                <span className="text-2xl">✓</span>
                <span className="font-medium">Updated {applyResult} {applyResult === 1 ? 'entry' : 'entries'}</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  Apply <span className="font-semibold text-xero-green">{confirm.category}</span> to all entries named{' '}
                  <span className="font-semibold text-gray-900">"{confirm.name}"</span>?
                </p>
                <p className="text-xs text-gray-400">This updates every existing entry with that name across all months.</p>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex-1 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  >Skip</button>
                  <button
                    type="button"
                    onClick={handleApplyAll}
                    disabled={applying}
                    className="flex-1 py-2.5 text-sm rounded-lg bg-xero-green text-white font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-50"
                  >{applying ? 'Applying…' : 'Apply to all'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  if (duplicate) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-xero-border flex items-center gap-2">
            <span className="text-amber-500 text-lg">⚠</span>
            <h2 className="text-lg font-semibold text-gray-900">Duplicate Entry</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">An identical entry already exists:</p>
            <div className="bg-xero-bg rounded-xl px-4 py-3 text-sm space-y-1">
              <p className="font-medium text-gray-900">{duplicate.name}</p>
              <p className="text-gray-500">{formatDate(duplicate.date)} · {duplicate.category}</p>
              <p className={`font-semibold ${duplicate.type === 'income' ? 'text-xero-green' : 'text-gray-800'}`}>
                {duplicate.type === 'income' ? '+' : '-'}{formatEur(duplicate.amount)}
              </p>
            </div>
            <p className="text-xs text-gray-400">Override replaces the existing entry. Keep Both creates a second entry.</p>
            <div className="flex flex-col gap-2 pt-1">
              <button type="button" onClick={handleDuplicateOverride} disabled={saving}
                className="w-full py-2.5 text-sm rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Override existing'}
              </button>
              <button type="button" onClick={handleDuplicateKeepBoth} disabled={saving}
                className="w-full py-2.5 text-sm rounded-lg bg-xero-green text-white font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Keep both'}
              </button>
              <button type="button" onClick={() => setDuplicate(null)}
                className="w-full py-2.5 text-sm rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors">
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-xero-border">
          <h2 className="text-lg font-semibold text-gray-900">{transaction ? 'Edit Entry' : 'Add Entry'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2 bg-xero-bg rounded-lg p-1">
            {(['expense', 'income'] as TxType[]).map(t => (
              <button key={t} type="button"
                onClick={() => set({ type: t, category: t === 'income' ? 'Salary' : 'Others' })}
                className={`flex-1 py-2 text-sm rounded-md font-medium capitalize transition-colors ${form.type === t ? 'bg-white text-xero-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >{t}</button>
            ))}
          </div>

          <input className="w-full border border-xero-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            placeholder="Description" value={form.name} onChange={e => set({ name: e.target.value })} />
          <input className="w-full border border-xero-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            placeholder="Amount (€)" type="number" min="0" step="0.01" value={form.amount} onChange={e => set({ amount: e.target.value })} />
          <input className="w-full border border-xero-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            type="date" value={form.date} onChange={e => set({ date: e.target.value })} />
          <select className="w-full border border-xero-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            value={form.category} onChange={e => set({ category: e.target.value as Category })}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>

          {/* Repeat — hidden when editing */}
          {!transaction && (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Repeat every</p>
                <div className="flex gap-1.5 bg-xero-bg rounded-lg p-1">
                  {REPEAT_OPTIONS.map(o => (
                    <button key={o.value} type="button" onClick={() => set({ repeat: o.value })}
                      className={pillBtn(form.repeat === o.value)}>{o.label}</button>
                  ))}
                </div>
              </div>
              {isRecurring && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Times</p>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={form.repeatCount}
                    onChange={e => set({ repeatCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full border border-xero-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
                  />
                  <p className="text-xs text-xero-green mt-1.5 font-medium">
                    → {entryCount} {entryCount === 1 ? 'entry' : 'entries'} will be created
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm rounded-lg bg-xero-green text-white font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : isRecurring ? `Create ${entryCount} entries` : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
