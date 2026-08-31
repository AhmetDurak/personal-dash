import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useLanguage } from '../../hooks/useLanguage'

function fmtPrice(v: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
}

interface Props {
  currency?: string
  title?: string
}

// Compound-interest savings plan projection: an optional initial lump sum plus
// a fixed monthly contribution, both compounding at the given annual return.
// Used standalone (Finance → Savings Plan) and per-ticker inside ETF Monitor.
export function SavingsPlanCalculator({ currency = 'EUR', title }: Props) {
  const [initial, setInitial] = useState(0)
  const [monthly, setMonthly] = useState(100)
  const [years, setYears]     = useState(10)
  const [rate, setRate]       = useState(7)

  const { chartData, finalValue, totalInvested } = useMemo(() => {
    const r = Math.pow(1 + rate / 100, 1 / 12) - 1
    const points: { year: number; invested: number; value: number }[] = []
    for (let yr = 0; yr <= years; yr++) {
      const months = yr * 12
      const growth = Math.pow(1 + r, months)
      const fvContrib = r > 0 ? monthly * ((growth - 1) / r) : monthly * months
      const fv = initial * growth + fvContrib
      const invested = initial + monthly * months
      points.push({ year: yr, invested: Math.round(invested), value: Math.round(fv) })
    }
    const last = points[points.length - 1]
    return { chartData: points, finalValue: last.value, totalInvested: last.invested }
  }, [initial, monthly, years, rate])

  const gain = finalValue - totalInvested

  const { t } = useLanguage()

  return (
    <div className="bg-white rounded-xl border border-xero-border p-6">
      {title && <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {([
          { label: t.etfInitialAmount, value: initial, min: 0, max: undefined, step: 100, unit: '€', set: setInitial },
          { label: t.etfMonthlyRate,   value: monthly, min: 1, max: undefined, step: 1,   unit: '€', set: setMonthly },
          { label: t.etfDuration,      value: years,   min: 1, max: 50,        step: 1,   unit: 'J', set: setYears },
          { label: t.etfAnnualReturn,  value: rate,    min: 0, max: 50,        step: 0.5, unit: '%', set: setRate },
        ] as const).map(f => (
          <label key={f.label} className="block">
            <span className="text-xs text-gray-500 mb-1 block">{f.label}</span>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <input type="number" min={f.min} max={f.max} step={f.step} value={f.value}
                onChange={e => f.set(Number(e.target.value) as never)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none" />
              <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500">{f.unit}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: t.etfFinalValue, value: fmtPrice(finalValue, currency), color: 'text-xero-green' },
          { label: t.etfInvested,   value: fmtPrice(totalInvested, currency), color: 'text-gray-900' },
          { label: t.etfGain,       value: fmtPrice(gain, currency), color: gain >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}J`} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number, name: string) => [fmtPrice(v, currency), name === 'value' ? t.etfDepotValue : t.etfInvested]} labelFormatter={l => `Jahr ${l}`} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} />
          <Line type="monotone" dataKey="invested" stroke="#CBD5E1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
