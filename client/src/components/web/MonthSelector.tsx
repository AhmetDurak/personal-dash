import { useState, useRef, useEffect } from 'react'
import { currentMonth } from '../../utils/format'

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

interface Props { month: string; onChange: (m: string) => void; align?: 'left' | 'right' }

export function MonthSelector({ month, onChange, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const now = currentMonth()
  const [nowYear, nowMonth] = now.split('-').map(Number)
  const [selYear, selMonth] = month.split('-').map(Number)

  // year shown in the popover — starts at the selected year
  const [viewYear, setViewYear] = useState(selYear)

  // sync viewYear when the selected month changes externally
  useEffect(() => { setViewYear(selYear) }, [selYear])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function select(m: number) {
    onChange(`${viewYear}-${String(m).padStart(2, '0')}`)
    setOpen(false)
  }

  function isDisabled(m: number) {
    return viewYear > nowYear || (viewYear === nowYear && m > nowMonth)
  }

  const label = new Date(selYear, selMonth - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-xero-border rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors min-w-[160px] justify-between"
      >
        <span>{label}</span>
        <span className={`text-gray-400 text-[10px] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className={`absolute top-full mt-1.5 z-50 bg-white border border-xero-border rounded-xl shadow-xl p-4 w-[220px] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewYear(y => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors text-base"
            >‹</button>
            <span className="text-sm font-semibold text-gray-800">{viewYear}</span>
            <button
              onClick={() => setViewYear(y => y + 1)}
              disabled={viewYear >= nowYear}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors text-base disabled:opacity-25 disabled:cursor-not-allowed"
            >›</button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((name, i) => {
              const m = i + 1
              const disabled = isDisabled(m)
              const selected = viewYear === selYear && m === selMonth
              const isNow    = viewYear === nowYear && m === nowMonth

              return (
                <button
                  key={m}
                  onClick={() => { if (!disabled) select(m) }}
                  disabled={disabled}
                  className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    selected
                      ? 'bg-xero-green text-white shadow-sm'
                      : disabled
                      ? 'text-gray-200 cursor-not-allowed'
                      : isNow
                      ? 'border border-xero-green/60 text-xero-green hover:bg-xero-green/10'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
