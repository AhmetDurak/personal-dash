import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BalanceSeries, BarDataset } from '../../types'

const SPANS = ['3M', '6M', '1Y', '3Y', '5Y'] as const
export type Span = typeof SPANS[number]

interface Props { data: BalanceSeries; span: Span; onSpanChange: (s: Span) => void; barData?: BarDataset }

export function BalanceChart({ data, span, onSpanChange, barData }: Props) {
  let cumulative = 0
  const chartData = data.labels.map((label, i) => {
    const barIdx = barData ? barData.labels.indexOf(label) : -1
    if (barData && barIdx !== -1) {
      const net = Math.round((barData.income[barIdx] - barData.expenses[barIdx]) * 100) / 100
      cumulative = Math.round((cumulative + net) * 100) / 100
    }
    return {
      label,
      balance: data.balance[i],
      investments: data.investmentsYTD[i],
      ...(barData ? { totalNet: barIdx !== -1 ? cumulative : null } : {}),
    }
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Balance Trend</h2>
        <div className="flex gap-1 bg-xero-bg rounded-lg p-1">
          {SPANS.map(s => (
            <button
              key={s}
              onClick={() => onSpanChange(s)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                span === s
                  ? 'bg-white text-xero-green shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
          <Tooltip formatter={(v: number, name: string) => [`${v.toFixed(2)} €`, name]} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
          <Legend />
          <Line type="monotone" dataKey="balance" stroke="#00B087" name="Balance" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="investments" stroke="#8B5CF6" name="Investments YTD" dot={false} strokeWidth={2} />
          {barData && <Line type="monotone" dataKey="totalNet" stroke="#6366F1" name="Total Net Savings" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
