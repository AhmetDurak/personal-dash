import { useState, useRef, useEffect } from 'react'
import { IconFolder } from '../../lib/icons'

// Folder badge + dropdown to move the current item to any folder (or a new one).
export function FolderMoveButton({ folder, folders, onMove, label, openDown = false }: {
  folder: string | null
  folders: string[]
  onMove: (folder: string | null) => void
  label?: string        // button text instead of the current folder name
  openDown?: boolean    // open the menu below the button (default: above)
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [open])

  function pick(f: string | null) { onMove(f); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs px-2.5 min-h-[44px] md:min-h-0 md:py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 max-w-[180px]"
      >
        <IconFolder className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
        <span className="truncate">{label ?? folder ?? 'No folder'}</span>
      </button>
      {open && (
        <div className={`absolute ${openDown ? 'left-0 top-full mt-1' : 'right-0 bottom-full mb-1'} z-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg py-1 w-56 max-w-[calc(100vw-2rem)]`}>
          <div className="max-h-52 overflow-y-auto">
            <button type="button" onClick={() => pick(null)}
              className="w-full text-left text-xs px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-400">No folder</button>
            {folders.map(f => (
              <button type="button" key={f} onClick={() => pick(f)}
                className={`w-full text-left text-xs px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 truncate ${f === folder ? 'text-xero-green font-medium' : 'text-gray-700 dark:text-slate-200'}`}>{f}</button>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1 px-2 pb-1">
            <input
              placeholder="New folder…"
              className="w-full text-base md:text-xs border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-slate-100 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-xero-green"
              onKeyDown={e => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const name = e.currentTarget.value.trim()
                if (name) pick(name)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
