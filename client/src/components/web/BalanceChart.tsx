import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BalanceSeries } from '../../types'

interface Props { data: BalanceSeries }

export function BalanceChart({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({
    label,
    balance: data.balance[i],
    investments: data.investmentsYTD[i],
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Balance Trend</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
          <Legend />
          <Line type="monotone" dataKey="balance" stroke="#1D9E75" name="Balance" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="investments" stroke="#534AB7" name="Investments YTD" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
