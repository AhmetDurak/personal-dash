import { useState, useRef, useEffect } from 'react'
import { IconCheck, IconSort } from '../../lib/icons'
import { isTouch } from './ItemFolderTree'

// Sort icon button for list toolbars — opens a "Sort by" menu styled like the
// folder tree's context menu. Takes the `sort` object returned by useTreeSort.
export function SortMenuButton({ sort }: {
  sort: { key: string; options: Array<{ value: string; label: string }>; onChange: (key: string) => void }
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [open])

  const activeLabel = sort.options.find(o => o.value === sort.key)?.label ?? ''

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title={`Sort: ${activeLabel}`}
        className={`text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 -m-0.5 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}>
        <IconSort className="w-4 h-4" strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-slate-800 border border-xero-border dark:border-slate-700 rounded-xl shadow-2xl py-1 min-w-[160px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 px-3 pt-1.5 pb-1">Sort by</p>
          {sort.options.map(o => (
            <button key={o.value} onClick={() => { sort.onChange(o.value); setOpen(false) }}
              className={`w-full text-left text-xs px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between gap-3 ${o.value === sort.key ? 'text-xero-green font-medium' : 'text-gray-700 dark:text-slate-300'}`}>
              {o.label}{o.value === sort.key && <IconCheck className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
