import { formatMonth } from '../../utils/format'

interface Props { month: string }

export function DashboardHeader({ month }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Finance Dashboard</h1>
        <p className="text-sm text-gray-500">{formatMonth(month)}</p>
      </div>
      <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded">PSD2</span>
    </header>
  )
}
