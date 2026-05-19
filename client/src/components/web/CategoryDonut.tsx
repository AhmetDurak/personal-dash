import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatEur } from '../../utils/format'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

export function CategoryDonut({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({ name: label, value: data.values[i] }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Expenses by Category</h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={65} outerRadius={105}>
            {data.colors.map((color, i) => <Cell key={i} fill={color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatEur(Math.round(v * 100))} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0' }} />
          <Legend iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
