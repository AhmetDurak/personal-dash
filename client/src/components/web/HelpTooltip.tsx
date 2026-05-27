import { useState, useEffect, useRef } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface Props {
  id:       string
  title:    string
  children: React.ReactNode
  side?:    'top' | 'bottom' | 'left' | 'right'
}

export function HelpTooltip({ id, title, children, side = 'bottom' }: Props) {
  const storageKey = `help:seen:${id}`
  const [open, setOpen]         = useState(false)
  const [isNew, setIsNew]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setIsNew(true)
  }, [storageKey])

  useEffect(() => {
    if (!open) return
    localStorage.setItem(storageKey, '1')
    setIsNew(false)
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, storageKey])

  const popoverPos: Record<string, string> = {
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    top:    'bottom-full mb-2 left-1/2 -translate-x-1/2',
    left:   'right-full mr-2 top-1/2 -translate-y-1/2',
    right:  'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        title={title}
        className={`relative inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
          open
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-600 dark:hover:text-slate-300'
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />
        {isNew && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </button>

      {open && (
        <div
          className={`absolute ${popoverPos[side]} z-50 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg p-4`}
        >
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</p>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed space-y-1.5">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
