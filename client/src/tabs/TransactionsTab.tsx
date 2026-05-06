import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useTransactions } from '../hooks/useTransactions'
import { MonthSelector } from '../components/web/MonthSelector'
import { TransactionList } from '../components/web/TransactionList'
import { AddEntryModal } from '../components/web/AddEntryModal'

interface Props { month: string; onMonthChange: (m: string) => void }

export function TransactionsTab({ month, onMonthChange }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: txs, isLoading } = useTransactions(month)

  async function handleDelete(id: string) {
    await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    mutate(`/api/transactions/${month}`)
  }

  function onSaved() { mutate(`/api/transactions/${month}`) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <MonthSelector month={month} onChange={onMonthChange} />
        <button onClick={() => setModal(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
          + Add
        </button>
      </div>
      {isLoading || !txs
        ? <div className="text-sm text-gray-400">Loading…</div>
        : <TransactionList transactions={txs} onDelete={handleDelete} />
      }
      {modal && <AddEntryModal month={month} onClose={() => setModal(false)} onSaved={onSaved} />}
    </div>
  )
}
