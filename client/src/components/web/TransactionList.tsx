import { useState } from 'react'
import { formatEur, formatDate } from '../../utils/format'
import { CAT_COLORS, CAT_ICONS } from '../../constants/categories'
import type { Transaction } from '../../types'
import { ConfirmDialog } from './ConfirmDialog'

type SortField = 'date' | 'amount' | 'name' | 'category'
type SortDir = 'asc' | 'desc'

interface Props {
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (tx: Transaction) => void
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (field: SortField) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block leading-none ${active ? 'text-xero-green' : 'text-gray-300'}`}>
      {active && dir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export function TransactionList({
  transactions, onDelete, onEdit, sortField, sortDir = 'desc', onSort,
  selectedIds, onToggleSelect, onToggleAll,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (!transactions.length) {
    return <p className="text-sm text-gray-400 py-12 text-center">No transactions this month</p>
  }

  const allSelected = transactions.length > 0 && transactions.every(tx => selectedIds.has(tx.id))
  const someSelected = transactions.some(tx => selectedIds.has(tx.id))

  function th(label: string, field: SortField, align: 'left' | 'right' = 'left') {
    const active = sortField === field
    return (
      <th
        className={`px-4 py-2.5 font-medium ${align === 'right' ? 'text-right pr-6' : 'text-left'} ${onSort ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
        onClick={() => onSort?.(field)}
      >
        {label}<SortIcon active={active} dir={sortDir} />
      </th>
    )
  }

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-xero-border overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="bg-xero-bg text-xs uppercase tracking-wide text-gray-500 border-b border-xero-border">
            <th className="pl-4 pr-2 py-2.5 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={onToggleAll}
                className="rounded border-gray-300 text-xero-green focus:ring-xero-green cursor-pointer"
              />
            </th>
            {th('Description', 'name')}
            {th('Category', 'category')}
            {th('Date', 'date')}
            {th('Amount', 'amount', 'right')}
            <th className="px-4 py-2.5 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-xero-border">
          {transactions.map(tx => {
            const selected = selectedIds.has(tx.id)
            return (
              <tr
                key={tx.id}
                className={`hover:bg-gray-50 transition-colors group ${selected ? 'bg-xero-green/5' : ''}`}
                onClick={() => onToggleSelect(tx.id)}
              >
                <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(tx.id)}
                    className="rounded border-gray-300 text-xero-green focus:ring-xero-green cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg w-6 text-center flex-shrink-0">{CAT_ICONS[tx.category]}</span>
                    <span className="font-medium text-gray-900">{tx.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.source === 'bank' ? 'bg-gray-100 text-gray-500' : 'bg-xero-green/10 text-xero-green'
                    }`}>{tx.source}</span>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[tx.category] }} />
                    <span className="text-gray-600">{tx.category}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(tx.date)}</td>
                <td className={`px-6 py-3 text-right font-semibold ${tx.type === 'income' ? 'text-xero-green' : 'text-gray-800'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatEur(tx.amount)}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(tx)} className="p-1 text-gray-400 hover:text-blue-500 rounded" title="Edit">✎</button>
                    <button onClick={() => setConfirmId(tx.id)} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">×</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
    {confirmId && (
      <ConfirmDialog
        message="This transaction will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
        onCancel={() => setConfirmId(null)}
      />
    )}
    </>
  )
}
