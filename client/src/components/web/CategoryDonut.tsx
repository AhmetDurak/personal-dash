import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatEur } from '../../utils/format'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

export function CategoryDonut({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({ name: label, value: data.values[i] }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Expenses by Category</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
            {data.colors.map((color, i) => <Cell key={i} fill={color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatEur(Math.round(v * 100))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
