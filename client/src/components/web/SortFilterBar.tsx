import { IconSearch, IconClose, IconSort } from '../../lib/icons'

interface SortFilterBarProps {
  query: string
  onQuery: (q: string) => void
  sortKey: string
  onSort: (k: string) => void
  sorts: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}

export function SortFilterBar({
  query, onQuery, sortKey, onSort, sorts, placeholder = 'Search…', className = '',
}: SortFilterBarProps) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1.5 ${className}`}>
      <div className="flex-1 relative">
        <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" strokeWidth={2} />
        <input
          type="text"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs pl-6 pr-8 py-2.5 min-h-[44px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-xero-green placeholder-gray-300 dark:placeholder-slate-600"
        />
        {query && (
          <button
            onClick={() => onQuery('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <IconClose className="w-3 h-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="relative flex-shrink-0">
        <IconSort className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" strokeWidth={2} />
        <select
          value={sortKey}
          onChange={e => onSort(e.target.value)}
          className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg pl-5 pr-1.5 py-2.5 min-h-[44px] outline-none focus:ring-1 focus:ring-xero-green text-gray-600 dark:text-slate-400 cursor-pointer appearance-none"
        >
          {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  )
}
