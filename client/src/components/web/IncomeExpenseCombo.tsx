import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BarDataset } from '../../types'
import type { Span } from './BalanceChart'

const SPANS = ['3M', '6M', '1Y', '3Y', '5Y'] as const

interface Props { data: BarDataset; span: Span; onSpanChange: (s: Span) => void }

export function IncomeExpenseCombo({ data, span, onSpanChange }: Props) {
  const chartData = data.labels.map((label, i) => ({
    label,
    income: data.income[i],
    expenses: data.expenses[i],
    net: Math.round((data.income[i] - data.expenses[i]) * 100) / 100,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Income and Expenses</h2>
        <div className="flex gap-1 bg-xero-bg rounded-lg p-1">
          {SPANS.map(s => (
            <button
              key={s}
              onClick={() => onSpanChange(s)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                span === s ? 'bg-white text-xero-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="income" fill="#00B087" name="Income" radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expenses" fill="#F59E0B" name="Expenses" radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Line type="monotone" dataKey="net" stroke="#1E2B4A" name="Net" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
