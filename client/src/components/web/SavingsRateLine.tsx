import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

export function SavingsRateLine({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({
    label,
    rate: data.income[i] > 0
      ? Math.round(((data.income[i] - data.expenses[i]) / data.income[i]) * 1000) / 10
      : 0,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Savings Rate</h2>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Savings Rate']} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
          <ReferenceLine y={0} stroke="#E8EBF0" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#0EA5E9"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props
              return <circle key={cx} cx={cx} cy={cy} r={3} fill={payload.rate >= 0 ? '#0EA5E9' : '#EF4444'} stroke="white" strokeWidth={1.5} />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
