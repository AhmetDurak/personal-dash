export type Tab = 'overview' | 'transactions' | 'charts'

interface Props { active: Tab; onChange: (t: Tab) => void }

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'charts', label: 'Charts' },
]

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="flex border-b border-gray-200 bg-white px-6">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
