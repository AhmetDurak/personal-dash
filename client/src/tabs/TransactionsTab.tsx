import { useState, useMemo, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { useTransactions } from '../hooks/useTransactions'
import { useSummary } from '../hooks/useSummary'
import { TransactionList } from '../components/web/TransactionList'
import { AddEntryModal } from '../components/web/AddEntryModal'
import { formatEur } from '../utils/format'
import { MonthSelector } from '../components/web/MonthSelector'
import { PdfImportModal } from '../components/web/PdfImportModal'
import { CAT_COLORS } from '../constants/categories'
import { EXPENSE_CATS, INCOME_CATS } from '../types'
import type { Transaction, Category, PdfPreview } from '../types'

type SortField = 'date' | 'amount' | 'name' | 'category'
type SortDir = 'asc' | 'desc'

interface Props { month: string; onMonthChange: (m: string) => void }


export function TransactionsTab({ month, onMonthChange }: Props) {
  const [addModal, setAddModal]       = useState(false)
  const [editTx, setEditTx]           = useState<Transaction | null>(null)
  const [sortField, setSortField]     = useState<SortField>('date')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<Category>('Others')
  const [bulkWorking, setBulkWorking] = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; overridden: number } | null>(null)
  const [pdfPreview, setPdfPreview]   = useState<PdfPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()
  const { data: txs, isLoading } = useTransactions(month)
  const { data: summary } = useSummary(month)

  function refresh() {
    mutate(`/api/transactions/${month}`)
    setSelectedIds(new Set())
  }

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'date' ? 'desc' : 'asc') }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    refresh()
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleToggleAll() {
    if (!sorted.length) return
    const allSelected = sorted.every(tx => selectedIds.has(tx.id))
    setSelectedIds(allSelected ? new Set() : new Set(sorted.map(tx => tx.id)))
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return
    setBulkWorking(true)
    await Promise.all([...selectedIds].map(id => fetch(`/api/entries/${id}`, { method: 'DELETE' })))
    setBulkWorking(false)
    refresh()
  }

  async function handleBulkCategory() {
    if (!selectedIds.size) return
    setBulkWorking(true)
    await Promise.all([...selectedIds].map(id =>
      fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: bulkCategory }),
      })
    ))
    setBulkWorking(false)
    refresh()
  }

  async function handleImportPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const form = new FormData()
      form.append('pdf', file)
      const res = await fetch('/api/import/pdf/preview', { method: 'POST', body: form })
      const preview = await res.json() as PdfPreview
      if (preview.conflicts.length > 0) {
        setPdfPreview(preview)
      } else {
        // no conflicts — import all ready entries immediately
        const confirmRes = await fetch('/api/import/pdf/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: preview.ready.map(tx => ({ tx })) }),
        })
        const data = await confirmRes.json() as { imported: number; overridden: number }
        setImportResult(data)
        refresh()
      }
    } catch {
      setImportResult({ imported: 0, overridden: -1 })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handlePdfImported(result: { imported: number; overridden: number }) {
    setPdfPreview(null)
    setImportResult(result)
    refresh()
  }

  const sorted = useMemo(() => {
    if (!txs) return []
    return [...txs].sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [txs, sortField, sortDir])

  const hasSelection = selectedIds.size > 0

  const nonZeroCategories = useMemo(() => {
    if (!summary) return []
    return (Object.entries(summary.byCategory) as [Category, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
  }, [summary])

  return (
    <div className="p-4 md:p-8 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <MonthSelector month={month} onChange={onMonthChange} />
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400">{txs ? `${txs.length} entries` : ''}</p>
          {importResult && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${importResult.overridden === -1 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
              {importResult.overridden === -1
                ? 'Import failed'
                : `✓ ${importResult.imported} imported${importResult.overridden > 0 ? `, ${importResult.overridden} overridden` : ''}`}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="text-sm border border-xero-border text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >{importing ? 'Importing…' : '↑ Import PDF'}</button>
          <button
            onClick={() => setAddModal(true)}
            className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg hover:bg-xero-green-dark font-medium transition-colors"
          >+ Add Entry</button>
        </div>
      </div>

      {/* Monthly summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-xero-border shadow-sm overflow-hidden">
          {/* Totals row */}
          <div className="flex items-stretch divide-x divide-xero-border">
            <div className="flex-1 flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-xero-green flex-shrink-0" />
                <span className="text-xs text-gray-500">Income</span>
              </div>
              <span className="text-sm font-semibold text-xero-green">{formatEur(summary.income)}</span>
            </div>
            <div className="flex-1 flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-xs text-gray-500">Expenses</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">{formatEur(summary.totalExpenses)}</span>
            </div>
            <div className="flex-1 flex items-center justify-between px-5 py-3 gap-3">
              <span className="text-xs text-gray-500">Net</span>
              <span className={`text-sm font-semibold ${summary.net >= 0 ? 'text-xero-green' : 'text-red-500'}`}>
                {summary.net >= 0 ? '+' : ''}{formatEur(summary.net)}
              </span>
            </div>
          </div>
          {/* Category breakdown */}
          {nonZeroCategories.length > 0 && (
            <div className="border-t border-xero-border px-5 py-2.5 flex items-center gap-x-5 gap-y-1.5 flex-wrap">
              {nonZeroCategories.map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[cat as Category] }} />
                  <span className="text-gray-500">{cat}</span>
                  <span className="font-medium text-gray-700">{formatEur(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-xero-green/8 border border-xero-green/20 rounded-xl text-sm">
          <span className="font-medium text-xero-green min-w-[80px]">{selectedIds.size} selected</span>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {/* Change category */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-xs">Set category:</span>
              <select
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value as Category)}
                className="border border-xero-border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-xero-green"
              >
                <optgroup label="Income">
                  {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Expense">
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </optgroup>
              </select>
              <button
                onClick={handleBulkCategory}
                disabled={bulkWorking}
                className="px-3 py-1 text-xs font-medium bg-white border border-xero-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >Apply</button>
            </div>

            <div className="w-px h-4 bg-gray-200" />

            {/* Delete selected */}
            <button
              onClick={handleBulkDelete}
              disabled={bulkWorking}
              className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >🗑 Delete {selectedIds.size === sorted.length ? 'all' : 'selected'}</button>
          </div>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            title="Clear selection"
          >×</button>
        </div>
      )}

      {/* List */}
      {isLoading || !txs
        ? <div className="text-sm text-gray-400">Loading…</div>
        : <TransactionList
            transactions={sorted}
            onDelete={handleDelete}
            onEdit={setEditTx}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
          />
      }
      {addModal && <AddEntryModal month={month} onClose={() => setAddModal(false)} onSaved={refresh} />}
      {editTx && <AddEntryModal month={month} transaction={editTx} onClose={() => setEditTx(null)} onSaved={refresh} />}
      {pdfPreview && <PdfImportModal preview={pdfPreview} onClose={() => setPdfPreview(null)} onImported={handlePdfImported} />}
    </div>
  )
}
