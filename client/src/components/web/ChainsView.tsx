import { useState } from 'react'
import { useChains } from '../../hooks/useChains'
import type { Chain } from '../../hooks/useChains'
import { ConfirmDialog } from './ConfirmDialog'
import { IconAdd, IconDelete, IconTrophy } from '../../lib/icons'

// ─── Status helpers ─────────────────────────────────────────────────────────

type ChainStatus = 'broken' | 'complete' | 'progress'

function getStatus(chain: Chain): ChainStatus {
  if (chain.marks.some(m => m === 'cross')) return 'broken'
  if (chain.marks.every(m => m === 'check')) return 'complete'
  return 'progress'
}

const STATUS_EMOJI: Record<ChainStatus, string> = {
  broken: '😢',
  complete: '😄',
  progress: '🙂',
}

// ─── Chain card ─────────────────────────────────────────────────────────────

function ChainCard({ chain, onToggle, onDelete }: {
  chain: Chain
  onToggle: (index: number) => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const status = getStatus(chain)
  const checkedCount = chain.marks.filter(m => m === 'check').length
  const brokenCount = chain.marks.filter(m => m === 'cross').length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{chain.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            {checkedCount}/{chain.length} checked{brokenCount > 0 ? ` · ${brokenCount} broken` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span key={status} className="text-2xl chain-emoji-pop">{STATUS_EMOJI[status]}</span>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors"
            title="Delete chain"
          >
            <IconDelete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chain.marks.map((mark, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            title={`Day ${i + 1}`}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
              mark === 'check'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : mark === 'cross'
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-300 dark:border-slate-600 text-transparent hover:border-emerald-400 dark:hover:border-emerald-500'
            }`}
          >
            {mark === 'check' ? '✓' : mark === 'cross' ? '✗' : ''}
          </button>
        ))}
      </div>

      {status === 'complete' && (
        <div key="trophy" className="chain-emoji-pop mt-4 flex flex-col items-center gap-1 py-2 border-t border-gray-100 dark:border-slate-700">
          <IconTrophy className="w-7 h-7 text-amber-400" />
          <p className="text-xs font-semibold text-amber-500">Chain complete!</p>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`"${chain.name}" will be deleted.`}
          confirmLabel="Delete"
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ─── New chain form ─────────────────────────────────────────────────────────

function NewChainForm({ onCreate, onCancel }: {
  onCreate: (name: string, length: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [length, setLength] = useState('30')

  const inputCls = 'text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100'

  function submit() {
    const n = Number(length)
    if (!name.trim() || !n || n < 1) return
    onCreate(name.trim(), Math.min(Math.round(n), 366))
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">New Chain</p>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Chain name… (e.g. Daily workout)"
        className={inputCls}
      />
      <div className="w-32">
        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Chain length</p>
        <input
          type="number"
          min={1}
          max={366}
          value={length}
          onChange={e => setLength(e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="text-sm bg-xero-green text-white px-5 py-2 rounded-xl font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40 min-h-[44px]"
        >
          Create
        </button>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 min-h-[44px]">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main ChainsView ────────────────────────────────────────────────────────

export function ChainsView() {
  const { chains, addChain, toggleMark, removeChain } = useChains()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs italic text-gray-400 dark:text-slate-500">"Don't break the Chain."</p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-xero-green text-white px-3 py-2 rounded-xl font-medium hover:bg-xero-green-dark transition-colors min-h-[40px]"
        >
          <IconAdd className="w-3.5 h-3.5" />
          New Chain
        </button>
      </div>

      {showAdd && (
        <NewChainForm
          onCreate={(name, length) => { addChain(name, length); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-4">
        {chains.map(chain => (
          <ChainCard
            key={chain.id}
            chain={chain}
            onToggle={i => toggleMark(chain.id, i)}
            onDelete={() => removeChain(chain.id)}
          />
        ))}
      </div>

      {chains.length === 0 && !showAdd && (
        <div className="text-center py-14">
          <p className="text-3xl mb-3">🔗</p>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">No chains yet</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Create a chain and check off every day to keep it going.</p>
        </div>
      )}
    </div>
  )
}
