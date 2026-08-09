import { useState, useRef, useEffect } from 'react'
import { useChains } from '../../hooks/useChains'
import type { Chain, ChainMark } from '../../hooks/useChains'
import { ConfirmDialog } from './ConfirmDialog'
import { IconAdd, IconDelete, IconTrophy, IconEdit, IconCheck } from '../../lib/icons'

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

// ─── Date helpers ───────────────────────────────────────────────────────────
// Marks are sequential from a chain's creation date, so each day's real
// calendar date is derived rather than stored.

function dayIndexToDate(createdAt: string, index: number): Date {
  const created = new Date(createdAt)
  const d = new Date(created.getFullYear(), created.getMonth(), created.getDate())
  d.setDate(d.getDate() + index)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getTodayIndex(chain: Chain): number {
  const created = new Date(chain.createdAt)
  const createdMidnight = new Date(created.getFullYear(), created.getMonth(), created.getDate())
  const now = new Date()
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((nowMidnight.getTime() - createdMidnight.getTime()) / 86400000)
}

// ─── Drag-to-scroll (mouse only — touch keeps native scrolling) ────────────
// Pointer capture is deferred until real movement is seen, so a plain click
// on a link inside the strip is never hijacked into a zero-distance drag.
function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || isTouch) return

    let down = false, moved = false, startX = 0, startScroll = 0, pointerId = 0

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      down = true; moved = false
      startX = e.clientX; startScroll = el!.scrollLeft
      pointerId = e.pointerId
    }
    function onPointerMove(e: PointerEvent) {
      if (!down) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) > 4) {
        moved = true
        el!.classList.add('dragging')
        try { el!.setPointerCapture(pointerId) } catch { /* ignore */ }
      }
      if (moved) el!.scrollLeft = startScroll - dx
    }
    function endDrag() {
      if (!down) return
      down = false
      el!.classList.remove('dragging')
    }
    // Intercepts the click natively, before React's delegated listener sees
    // it, so a drag never also triggers the link's onToggle.
    function onClick(e: MouseEvent) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('pointerleave', endDrag)
    el.addEventListener('click', onClick)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('pointerleave', endDrag)
      el.removeEventListener('click', onClick)
    }
  }, [])

  return ref
}

// ─── Drawn chain link ───────────────────────────────────────────────────────

function gradientId(mark: ChainMark): string {
  if (mark === 'check') return 'chain-grad-check'
  if (mark === 'cross') return 'chain-grad-cross'
  return 'chain-grad-idle'
}

// One shared <defs> block, rendered once, referenced by every link's <ellipse> via url(#id).
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

function ChainLink({ mark, index, createdAt, onToggle }: {
  mark: ChainMark
  index: number
  createdAt: string
  onToggle: () => void
}) {
  const date = dayIndexToDate(createdAt, index)
  const isToday = isSameDay(date, new Date())
  const showMonth = index === 0 || date.getDate() === 1

  return (
    <div className="flex-shrink-0 flex flex-col items-center w-[38px]">
      <span className={`text-[10.5px] font-semibold h-[14px] flex items-center whitespace-nowrap tabular-nums ${
        showMonth ? 'text-xero-green uppercase text-[9px] tracking-wide' : isToday ? 'text-xero-green' : 'text-gray-300 dark:text-slate-600'
      }`}>
        {showMonth ? MONTH_ABBR[date.getMonth()] : date.getDate()}
      </span>
      <button
        onClick={onToggle}
        title={date.toDateString()}
        className="relative w-[38px] h-[60px] flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <svg viewBox="0 0 34 54" className="w-10 h-[60px] drop-shadow-sm">
          <ellipse cx="17" cy="27" rx="11" ry="23" fill="none" stroke={`url(#${gradientId(mark)})`} strokeWidth="7" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-base font-bold pointer-events-none drop-shadow-sm ${
          mark === 'check' ? 'text-emerald-700 dark:text-emerald-300' : mark === 'cross' ? 'text-red-700 dark:text-red-300' : ''
        }`}>
          {mark === 'check' ? '✓' : mark === 'cross' ? '✗' : ''}
        </span>
        {isToday && (
          <span
            className="absolute rounded-full border-[1.5px] border-xero-green opacity-55 pointer-events-none"
            style={{ inset: '8px 11px' }}
          />
        )}
      </button>
    </div>
  )
}

// ─── Chain card — full width, always expanded, edit-gated ──────────────────

function ChainCard({ chain, onToggle, onUpdate, onDeleteClick }: {
  chain: Chain
  onToggle: (index: number) => void
  onUpdate: (updates: { name?: string; length?: number }) => void
  onDeleteClick: () => void
}) {
  const status = getStatus(chain)
  const checkedCount = chain.marks.filter(m => m === 'check').length
  const brokenCount = chain.marks.filter(m => m === 'cross').length

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(chain.name)
  const [lengthDraft, setLengthDraft] = useState(String(chain.length))

  const stripRef = useDragScroll<HTMLDivElement>()

  // Scroll to today on mount, and again if the chain's length changes
  // (a manual reorder/toggle shouldn't yank the view, so marks isn't a dep).
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const todayIndex = getTodayIndex(chain)
    const inRange = todayIndex >= 0 && todayIndex < chain.marks.length
    const targetEl = inRange ? (strip.children[todayIndex] as HTMLElement | undefined) : undefined
    strip.scrollLeft = targetEl ? Math.max(0, targetEl.offsetLeft - strip.clientWidth / 2 + 19) : strip.scrollWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain.id, chain.length])

  function startEditing() {
    setNameDraft(chain.name)
    setLengthDraft(String(chain.length))
    setEditing(true)
  }

  function commitEditing() {
    const name = nameDraft.trim() || chain.name
    let length = Math.round(Number(lengthDraft))
    if (!length || length < 1) length = chain.length
    length = Math.min(length, 366)
    onUpdate({ name, length })
    setEditing(false)
  }

  function cancelEditing() {
    setEditing(false)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEditing(); if (e.key === 'Escape') cancelEditing() }}
              className="text-lg font-bold text-gray-900 dark:text-slate-100 bg-transparent border-b-[1.5px] border-xero-green outline-none w-full py-0.5"
            />
          ) : (
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100 break-words">{chain.name}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            {checkedCount}/
            {editing ? (
              <input
                type="number"
                min={1}
                max={366}
                value={lengthDraft}
                onChange={e => setLengthDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEditing(); if (e.key === 'Escape') cancelEditing() }}
                className="w-12 text-center bg-transparent border-b-[1.5px] border-xero-green outline-none tabular-nums"
              />
            ) : chain.length}
            {' checked'}
            {brokenCount > 0 && ` · ${brokenCount} missed`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span key={status} className="text-2xl chain-emoji-pop">{STATUS_EMOJI[status]}</span>
          <button
            onClick={() => (editing ? commitEditing() : startEditing())}
            title={editing ? 'Save changes' : 'Edit name and length'}
            className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              editing ? 'text-xero-green bg-xero-green/10' : 'text-gray-400 dark:text-slate-600 hover:text-xero-green'
            }`}
          >
            {editing ? <IconCheck className="w-3.5 h-3.5" strokeWidth={2.5} /> : <IconEdit className="w-3.5 h-3.5" strokeWidth={2} />}
          </button>
          <button
            onClick={onDeleteClick}
            title="Delete chain"
            className="p-2 rounded-lg text-gray-400 dark:text-slate-600 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <IconDelete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={stripRef} className="chain-strip flex items-end overflow-x-auto -mx-5 px-5 py-1">
        {chain.marks.map((mark, i) => (
          <ChainLink
            key={i}
            mark={mark}
            index={i}
            createdAt={chain.createdAt}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>

      {status === 'complete' && (
        <div key="trophy" className="chain-emoji-pop flex flex-col items-center gap-1 pt-4">
          <IconTrophy className="w-8 h-8 text-amber-400" />
          <p className="text-sm font-semibold text-amber-500">Chain complete!</p>
        </div>
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

// ─── Main view — a single list, no nested detail page ──────────────────────

export function ChainsView() {
  const { chains, isLoading, addChain, toggleMark, updateChain, removeChain } = useChains()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const deletingChain = chains.find(c => c.id === confirmDeleteId) ?? null

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto overflow-y-auto h-full">
      <ChainGradients />
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

      {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>}

      <div className="space-y-3">
        {chains.map(chain => (
          <ChainCard
            key={chain.id}
            chain={chain}
            onToggle={i => toggleMark(chain.id, i)}
            onUpdate={updates => updateChain(chain.id, updates)}
            onDeleteClick={() => setConfirmDeleteId(chain.id)}
          />
        ))}
      </div>

      {!isLoading && chains.length === 0 && !showAdd && (
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
