import { formatEur, formatDate } from '../../utils/format'
import { CAT_COLORS, CAT_ICONS } from '../../constants/categories'
import type { Transaction } from '../../types'

interface Props {
  transactions: Transaction[]
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, onDelete }: Props) {
  if (!transactions.length) {
    return <p className="text-sm text-gray-400 py-8 text-center">No transactions this month</p>
  }

  return (
    <ul className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 overflow-hidden">
      {transactions.map(tx => (
        <li key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
          <span className="text-xl">{CAT_ICONS[tx.category]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{tx.name}</p>
            <p className="text-xs text-gray-400">{formatDate(tx.date)} · <span style={{ color: CAT_COLORS[tx.category] }}>{tx.category}</span></p>
          </div>
          <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-700'}`}>
            {tx.type === 'income' ? '+' : '-'}{formatEur(tx.amount)}
          </span>
          {tx.source === 'manual' && (
            <button onClick={() => onDelete(tx.id)} className="text-gray-300 hover:text-red-400 ml-1 text-lg leading-none">×</button>
          )}
        </li>
      ))}
    </ul>
  )
}
