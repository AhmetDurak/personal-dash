import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CAT_COLORS } from '../../constants/categories'
import type { StackedDataset } from '../../types'

interface Props { data: StackedDataset }

export function CategoryTrendLines({ data }: Props) {
  const chartData = data.labels.map((label, i) => {
    const point: Record<string, string | number> = { label }
    for (const cat of data.categories) point[cat] = data.series[cat]?.[i] ?? 0
    return point
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Expense Trends by Category</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          {data.categories.map(cat => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={CAT_COLORS[cat as keyof typeof CAT_COLORS] ?? '#888'}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
