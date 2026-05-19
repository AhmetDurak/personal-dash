export type Tab = 'overview' | 'cashflow' | 'simplified' | 'transactions'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Profit & Loss', icon: '⊞' },
  { id: 'cashflow',     label: 'Cash Flow',      icon: '⇌' },
  { id: 'simplified',   label: 'Simplified',     icon: '≡' },
  { id: 'transactions', label: 'Transactions',   icon: '↕' },
]

interface Props { active: Tab; onChange: (t: Tab) => void }

export function Sidebar({ active, onChange }: Props) {
  return (
    <aside className="w-[220px] min-h-screen bg-xero-navy flex flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-xero-navy-light">
        <p className="text-white font-bold text-lg tracking-tight">Finance</p>
        <p className="text-xero-green text-xs font-medium mt-0.5">Dashboard</p>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors text-left border-l-[3px] ${
                isActive
                  ? 'border-xero-green text-xero-green bg-xero-navy-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="px-6 py-4 border-t border-xero-navy-light">
        <p className="text-gray-500 text-xs">Personal Finance</p>
      </div>
    </aside>
  )
}
