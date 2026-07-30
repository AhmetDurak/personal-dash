import { useState } from 'react'
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { useChains } from '../../hooks/useChains'
import type { Chain, ChainMark } from '../../hooks/useChains'
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

// ─── Drawn chain link ───────────────────────────────────────────────────────

function gradientId(mark: ChainMark): string {
  if (mark === 'check') return 'chain-grad-check'
  if (mark === 'cross') return 'chain-grad-cross'
  return 'chain-grad-idle'
}

// One shared <defs> block, referenced by every link's <ellipse> via url(#id).
function ChainGradients() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="chain-grad-idle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="chain-grad-check" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id="chain-grad-cross" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f87171" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function ChainLink({ mark, index, onToggle, size = 'md' }: {
  mark: ChainMark
  index: number
  onToggle?: () => void
  size?: 'md' | 'sm'
}) {
  // Box is a touch narrower than the ring itself so neighbouring links
  // overlap slightly and read as one interlocked chain, all facing the same way.
  const box = size === 'sm' ? 'w-5 h-9' : 'w-8 h-14'
  const svg = size === 'sm' ? 'w-6 h-9' : 'w-9 h-14'
  const glyphSize = size === 'sm' ? 'text-xs' : 'text-base'

  const content = (
    <>
      <svg viewBox="0 0 34 54" className={`${svg} drop-shadow-sm`}>
        <ellipse cx="17" cy="27" rx="11" ry="23" fill="none" stroke={`url(#${gradientId(mark)})`} strokeWidth="7" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center ${glyphSize} font-bold pointer-events-none drop-shadow-sm ${
        mark === 'check' ? 'text-emerald-700 dark:text-emerald-800' : mark === 'cross' ? 'text-red-700 dark:text-red-800' : ''
      }`}>
        {mark === 'check' ? '✓' : mark === 'cross' ? '✗' : ''}
      </span>
    </>
  )

  if (!onToggle) {
    return <div className={`relative flex-shrink-0 ${box} flex items-center justify-center`}>{content}</div>
  }

  return (
    <button
      onClick={onToggle}
      title={`Day ${index + 1}`}
      className={`relative flex-shrink-0 ${box} flex items-center justify-center transition-transform hover:scale-105 active:scale-95`}
    >
      {content}
    </button>
  )
}

function ChainStrip({ chain, onToggle, size, max }: {
  chain: Chain
  onToggle?: (index: number) => void
  size?: 'md' | 'sm'
  max?: number
}) {
  const marks = max ? chain.marks.slice(0, max) : chain.marks
  const hiddenCount = max ? Math.max(0, chain.marks.length - max) : 0

  return (
    <div className="flex flex-wrap items-center">
      <ChainGradients />
      {marks.map((mark, i) => (
        <ChainLink
          key={i}
          mark={mark}
          index={i}
          size={size}
          onToggle={onToggle ? () => onToggle(i) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">+{hiddenCount} more</span>
      )}
    </div>
  )
}

// ─── Chain summary card (list) ──────────────────────────────────────────────

function ChainSummaryCard({ chain, onDeleteClick }: {
  chain: Chain
  onDeleteClick: () => void
}) {
  const status = getStatus(chain)
  const checkedCount = chain.marks.filter(m => m === 'check').length

  return (
    <Link
      to={chain.id}
      className="group block bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 hover:shadow-sm transition-all p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{chain.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{checkedCount}/{chain.length} checked</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span key={status} className="text-xl chain-emoji-pop">{STATUS_EMOJI[status]}</span>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDeleteClick() }}
            className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors"
            title="Delete chain"
          >
            <IconDelete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <ChainStrip chain={chain} size="sm" max={20} />
    </Link>
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

// ─── List view (/learn/chains) ──────────────────────────────────────────────

function ChainsListView() {
  const { chains, addChain, removeChain } = useChains()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const deletingChain = chains.find(c => c.id === confirmDeleteId) ?? null

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

      <div className="space-y-3">
        {chains.map(chain => (
          <ChainSummaryCard
            key={chain.id}
            chain={chain}
            onDeleteClick={() => setConfirmDeleteId(chain.id)}
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

      {deletingChain && (
        <ConfirmDialog
          message={`"${deletingChain.name}" will be deleted.`}
          confirmLabel="Delete"
          onConfirm={() => { removeChain(deletingChain.id); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}

// ─── Detail view (/learn/chains/:id) ────────────────────────────────────────

function ChainDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { chains, toggleMark, removeChain } = useChains()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const chain = chains.find(c => c.id === id)

  if (!chain) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-400 dark:text-slate-500 mb-3">Chain not found.</p>
        <Link to=".." className="text-sm text-xero-green hover:underline">← Back to chains</Link>
      </div>
    )
  }

  const status = getStatus(chain)
  const checkedCount = chain.marks.filter(m => m === 'check').length
  const brokenCount = chain.marks.filter(m => m === 'cross').length

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-gray-100 dark:border-slate-700">
        <Link
          to=".."
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-3 -ml-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back to chains"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{chain.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            {checkedCount}/{chain.length} checked{brokenCount > 0 ? ` · ${brokenCount} broken` : ''}
          </p>
        </div>
        <span key={status} className="text-2xl chain-emoji-pop flex-shrink-0">{STATUS_EMOJI[status]}</span>
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Delete chain"
        >
          <IconDelete className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <ChainStrip chain={chain} onToggle={i => toggleMark(chain.id, i)} />

        {status === 'complete' && (
          <div key="trophy" className="chain-emoji-pop flex flex-col items-center gap-1 py-4">
            <IconTrophy className="w-9 h-9 text-amber-400" />
            <p className="text-sm font-semibold text-amber-500">Chain complete!</p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`"${chain.name}" will be deleted.`}
          confirmLabel="Delete"
          onConfirm={() => { removeChain(chain.id); navigate('..') }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ─── Main ChainsView (router) ───────────────────────────────────────────────

export function ChainsView() {
  return (
    <Routes>
      <Route index element={<ChainsListView />} />
      <Route path=":id" element={<ChainDetailPage />} />
    </Routes>
  )
}
