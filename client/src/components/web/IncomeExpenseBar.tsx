import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useDarkMode } from '../../hooks/useDarkMode'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

export function IncomeExpenseBar({ data }: Props) {
  const { dark } = useDarkMode()
  const chartData = data.labels.map((label, i) => ({
    label,
    income: data.income[i],
    expenses: data.expenses[i],
  }))

  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${dark ? '#334155' : '#E8EBF0'}`,
    backgroundColor: dark ? '#1E293B' : '#ffffff',
    color: dark ? '#F1F5F9' : '#111827',
  }
  const axisColor = dark ? '#64748B' : '#9CA3AF'
  const gridColor = dark ? '#1E293B' : '#E8EBF0'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Income vs Expenses</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
          <Tooltip
            formatter={(v: number) => `${v.toFixed(2)} €`}
            contentStyle={tooltipStyle}
            itemStyle={{ color: dark ? '#F1F5F9' : '#111827' }}
          />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="income" fill="#00B087" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
