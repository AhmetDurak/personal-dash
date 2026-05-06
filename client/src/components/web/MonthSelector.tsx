import { formatMonth, prevMonths } from '../../utils/format'

interface Props { month: string; onChange: (m: string) => void }

export function MonthSelector({ month, onChange }: Props) {
  const options = prevMonths(12)
  return (
    <select
      value={month}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
    >
      {options.map(m => (
        <option key={m} value={m}>{formatMonth(m)}</option>
      ))}
    </select>
  )
}
