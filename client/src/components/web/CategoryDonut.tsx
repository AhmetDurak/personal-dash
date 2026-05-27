import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatEur } from '../../utils/format'
import { useDarkMode } from '../../hooks/useDarkMode'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

export function CategoryDonut({ data }: Props) {
  const { dark } = useDarkMode()
  const chartData = data.labels.map((label, i) => ({ name: label, value: data.values[i] }))

  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${dark ? '#334155' : '#E8EBF0'}`,
    backgroundColor: dark ? '#1E293B' : '#ffffff',
    color: dark ? '#F1F5F9' : '#111827',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Expenses by Category</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius="42%" outerRadius="72%">
            {data.colors.map((color, i) => <Cell key={i} fill={color} />)}
          </Pie>
          <Tooltip
            formatter={(v: number) => formatEur(Math.round(v * 100))}
            contentStyle={tooltipStyle}
            itemStyle={{ color: dark ? '#F1F5F9' : '#111827' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center">
        {chartData.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: data.colors[i] }} />
            <span className="text-xs text-gray-600">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
