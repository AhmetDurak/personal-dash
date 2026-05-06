import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

export function IncomeExpenseBar({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({
    label,
    income: data.income[i],
    expenses: data.expenses[i],
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Income vs Expenses</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
          <Legend />
          <Bar dataKey="income" fill="#1D9E75" name="Income" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" fill="#D85A30" name="Expenses" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
