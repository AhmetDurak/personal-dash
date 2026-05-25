import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatEur } from '../../utils/format'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

export function CategoryDonut({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({ name: label, value: data.values[i] }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Expenses by Category</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius="42%" outerRadius="72%">
            {data.colors.map((color, i) => <Cell key={i} fill={color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatEur(Math.round(v * 100))} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0' }} />
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
