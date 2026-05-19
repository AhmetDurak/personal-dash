import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatEur } from '../../utils/format'
import type { TopPayee } from '../../types'

interface Props { data: TopPayee[] }

const TRUNCATE = 28

export function TopPayeesBar({ data }: Props) {
  const chartData = data.map(p => ({
    name: p.name.length > TRUNCATE ? p.name.slice(0, TRUNCATE) + '…' : p.name,
    fullName: p.name,
    total: p.total,
  }))

  const height = Math.max(180, chartData.length * 38 + 40)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-xero-border p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Top Payees</h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => formatEur(v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={180} />
          <Tooltip
            formatter={(v: number, _: string, props: { payload?: { fullName?: string } }) => [formatEur(v), props.payload?.fullName ?? '']}
            contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#F59E0B' : i < 3 ? '#FBB040' : '#FCD27A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
