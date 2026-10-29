import { useState, useRef, useEffect } from 'react'
import { IconCheck } from '../../lib/icons'
import { FolderMoveButton } from './FolderMoveButton'
import { ConfirmDialog } from './ConfirmDialog'

// Multi-select state for a list of spaced-repetition items.
export function useSelection() {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  return {
    selecting,
    selected,
    start: () => setSelecting(true),
    exit: () => { setSelecting(false); setSelected(new Set()) },
    toggle: (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }),
    set: (ids: number[]) => setSelected(new Set(ids)),
  }
}

export function SelectCheckbox({ checked }: { checked: boolean }) {
  return (
    <span className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${checked ? 'bg-xero-green border-xero-green text-white' : 'border-gray-300 dark:border-slate-500'}`}>
      {checked && <IconCheck className="w-3 h-3" strokeWidth={3} />}
    </span>
  )
}

// YYYY-MM-DD in the user's local timezone (toISOString would give the UTC date).
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const btn = 'text-xs px-2.5 min-h-[44px] md:min-h-0 md:py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40'

// Toolbar shown above a list while selecting: select all / by language, then
// review, move, reset progress or delete the selection.
export function SelectionBar({ count, visibleCount, languages, folders, onSelectAll, onSelectLanguage, onClear, onExit, onReview, onMove, onReset, onDelete }: {
  count: number
  visibleCount: number
  languages: Array<{ value: string; label: string }>
  folders: string[]
  onSelectAll: () => void
  onSelectLanguage: (lang: string) => void
  onClear: () => void
  onExit: () => void
  onReview: () => void
  onMove: (folder: string | null) => void
  onReset: (startDate: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [langOpen, setLangOpen] = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const [startDate, setStartDate] = useState(localToday)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!langOpen) return
    function h(e: MouseEvent) { if (!langRef.current?.contains(e.target as Node)) setLangOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [langOpen])

  const none = count === 0

  return (
    <div className="px-2 pt-2 space-y-1.5 flex-shrink-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 mr-auto">{count} selected</span>
        <button onClick={count === visibleCount && count > 0 ? onClear : onSelectAll}
          className={`${btn} text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800`}>
          {count === visibleCount && count > 0 ? 'Clear' : 'All'}
        </button>
        {languages.length > 0 && (
          <div className="relative" ref={langRef}>
            <button onClick={() => setLangOpen(o => !o)} className={`${btn} text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800`}>
              Language ▾
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-slate-800 border border-xero-border dark:border-slate-700 rounded-xl shadow-2xl py-1 min-w-[140px]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 px-3 pt-1.5 pb-1">Select all in</p>
                {languages.map(l => (
                  <button key={l.value} onClick={() => { onSelectLanguage(l.value); setLangOpen(false) }}
                    className="w-full text-left text-xs px-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">{l.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={onExit} className={`${btn} text-gray-400 hover:text-gray-600 dark:hover:text-slate-300`}>Cancel</button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={onReview} disabled={none} className={`${btn} bg-violet-500 text-white hover:bg-violet-600`}>Review</button>
        {none
          ? <button disabled className={`${btn} bg-gray-100 dark:bg-slate-700 text-gray-500`}>Move</button>
          : <FolderMoveButton folder={null} folders={folders} onMove={onMove} label="Move" openDown />}
        <button onClick={() => { setStartDate(localToday()); setConfirm('reset') }} disabled={none} className={`${btn} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100`}>Reset</button>
        <button onClick={() => setConfirm('delete')} disabled={none} className={`${btn} bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100`}>Delete</button>
      </div>
      {confirm && (
        <ConfirmDialog
          message={confirm === 'delete'
            ? `Delete ${count} item${count === 1 ? '' : 's'}? This cannot be undone.`
            : `Reset progress for ${count} item${count === 1 ? '' : 's'}? Their forgetting curve starts over and they become due on the start date.`}
          confirmLabel={confirm === 'delete' ? 'Delete' : 'Reset'}
          onConfirm={async () => { const c = confirm; setConfirm(null); await (c === 'delete' ? onDelete() : onReset(startDate || localToday())) }}
          onCancel={() => setConfirm(null)}
        >
          {confirm === 'reset' && (
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-slate-200">
              Start on
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="text-base md:text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-100 rounded-lg px-2.5 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-xero-green" />
            </label>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
