import { useState, useRef, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  useETFWatchlist, useETFSnapshot, useETFChart, useETFComposition, useETFRisk, useETFSearch,
} from '../hooks/useETF'
import type { ETFSnapshot, ETFCandle } from '../types'
import { ConfirmDialog } from '../components/web/ConfirmDialog'

// ── Formatting helpers ───────────────────────────────────────────────────────

function fmtPrice(v: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
}
function fmtPct(v: number | null, decimals = 2) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`
}
function fmtTer(v: number | null) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}
function fmtAssets(v: number | null) {
  if (v == null) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mrd.`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio.`
  return `${(v / 1e3).toFixed(0)} Tsd.`
}
function fmtNum(v: number | null, decimals = 2) {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

// ── Sub-tab config ────────────────────────────────────────────────────────────

type SubTab = 'overview' | 'chart' | 'rendite' | 'basisinfo' | 'zusammensetzung' | 'risiko' | 'sparplan'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview',        label: 'Overview' },
  { id: 'chart',           label: 'Chart' },
  { id: 'rendite',         label: 'Rendite' },
  { id: 'basisinfo',       label: 'Basisinfo' },
  { id: 'zusammensetzung', label: 'Zusammensetzung' },
  { id: 'risiko',          label: 'Risiko' },
  { id: 'sparplan',        label: 'Sparplan' },
]

const CHART_RANGES = ['1mo', '3mo', '6mo', '1y', '3y', '5y'] as const
type ChartRange = typeof CHART_RANGES[number]
const RANGE_LABELS: Record<ChartRange, string> = { '1mo': '1M', '3mo': '3M', '6mo': '6M', '1y': '1J', '3y': '3J', '5y': '5J' }
const COMPARE_COLORS = ['#1D9E75', '#378ADD', '#D85A30']

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
      {children}
    </h2>
  )
}

// ── Watchlist row ─────────────────────────────────────────────────────────────

function WatchlistRow({
  ticker, selected, onClick, compareMode, inCompare, onToggleCompare,
}: {
  ticker: string; selected: boolean; onClick: () => void
  compareMode: boolean; inCompare: boolean; onToggleCompare: () => void
}) {
  const { data, isLoading, error } = useETFSnapshot(ticker)
  const positive = (data?.changePct ?? 0) >= 0
  return (
    <button
      onClick={compareMode ? onToggleCompare : onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors border-l-2 ${
        compareMode && inCompare ? 'bg-blue-50 border-l-blue-500'
          : !compareMode && selected ? 'bg-xero-green/10 border-l-xero-green'
          : 'hover:bg-gray-50 border-l-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {compareMode && (
            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[9px] ${
              inCompare ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
            }`}>
              {inCompare && '✓'}
            </div>
          )}
          <span className={`text-sm font-bold ${
            error ? 'text-red-400'
              : compareMode && inCompare ? 'text-blue-600'
              : !compareMode && selected ? 'text-xero-green'
              : 'text-gray-800'
          }`}>{ticker}</span>
        </div>
        {data && !error && (
          <span className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmtPct(data.changePct)}
          </span>
        )}
        {error && <span className="text-xs text-red-400">!</span>}
      </div>
      {data && !error && (
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-400 truncate w-28">{data.name}</p>
          <span className="text-xs text-gray-600">{fmtPrice(data.price, data.currency)}</span>
        </div>
      )}
      {isLoading && !data && <p className="text-xs text-gray-400 mt-0.5">Loading…</p>}
      {error && <p className="text-xs text-red-400 mt-0.5">Nicht gefunden</p>}
    </button>
  )
}

// ── Add-ticker panel ──────────────────────────────────────────────────────────

function AddTickerPanel({ onAdd }: { onAdd: (t: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const { data: results } = useETFSearch(query)

  async function handleAdd(ticker: string) {
    setAdding(true)
    try { await onAdd(ticker) } finally { setAdding(false); setQuery('') }
  }

  return (
    <div className="p-3 border-b border-gray-100">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && query.trim()) handleAdd(query.trim().toUpperCase()) }}
        placeholder="z.B. EUNL.DE, VWCE.DE…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
      />
      {results && results.length > 0 && query.length > 1 && (
        <ul className="mt-1 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          {results.slice(0, 6).map(r => (
            <li key={r.ticker}>
              <button disabled={adding} onClick={() => handleAdd(r.ticker)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <span className="text-xs font-bold text-gray-800">{r.ticker}</span>
                <span className="text-xs text-gray-400 ml-2">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Overview panel ────────────────────────────────────────────────────────────

function OverviewPanel({ snap }: { snap: ETFSnapshot }) {
  const pos = snap.changePct >= 0
  const range52 = snap.high52w - snap.low52w
  const pricePct = range52 > 0 ? ((snap.price - snap.low52w) / range52) * 100 : 50

  const kpis: { label: string; value: string }[] = [
    { label: 'NAV',          value: snap.nav ? fmtPrice(snap.nav, snap.currency) : '—' },
    { label: 'TER p.a.',     value: fmtTer(snap.ter) },
    { label: 'Ausschüttung', value: fmtPct(snap.yield) },
    { label: 'YTD Return',   value: fmtPct(snap.ytdReturn) },
    { label: 'Beta (3J)',    value: fmtNum(snap.beta) },
    { label: 'Fondsvolumen', value: fmtAssets(snap.totalAssets) },
    { label: '52W Hoch',     value: fmtPrice(snap.high52w, snap.currency) },
    { label: '52W Tief',     value: fmtPrice(snap.low52w, snap.currency) },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-xero-border p-6">
        <p className="text-sm text-gray-500 mb-1">{snap.name}</p>
        <div className="flex items-end gap-4">
          <span className="text-4xl font-bold text-gray-900">{fmtPrice(snap.price, snap.currency)}</span>
          <span className={`text-lg font-semibold mb-0.5 ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmtPct(snap.changePct)} ({pos ? '+' : ''}{fmtPrice(snap.change, snap.currency)})
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>52W Tief: {fmtPrice(snap.low52w, snap.currency)}</span>
            <span>52W Hoch: {fmtPrice(snap.high52w, snap.currency)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-xero-green rounded-full" style={{ width: `${Math.max(2, Math.min(98, pricePct))}%` }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-xero-border p-4">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className="text-sm font-semibold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chart panel ───────────────────────────────────────────────────────────────

function ChartPanel({ ticker, currency }: { ticker: string; currency: string }) {
  const [range, setRange] = useState<ChartRange>('1y')
  const { data: candles, isLoading } = useETFChart(ticker, range)

  const chartData = (candles ?? []).map(c => ({ date: c.date.slice(5), close: c.close }))
  const minClose = candles?.length ? Math.min(...candles.map(c => c.close)) : 0
  const maxClose = candles?.length ? Math.max(...candles.map(c => c.close)) : 0
  const domain: [number, number] = [minClose * 0.98, maxClose * 1.01]
  const positive = candles && candles.length > 1 ? candles[candles.length - 1].close >= candles[0].close : true

  return (
    <div className="bg-white rounded-xl border border-xero-border p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">Kursverlauf</p>
        <div className="flex gap-1">
          {CHART_RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r ? 'bg-xero-green text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      {isLoading && <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">Loading…</div>}
      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={domain} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}`} width={50} />
            <Tooltip formatter={(v: number) => [fmtPrice(v, currency), 'Kurs']} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} />
            <Line type="monotone" dataKey="close" stroke={positive ? '#1D9E75' : '#EF4444'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Rendite panel ─────────────────────────────────────────────────────────────

function periodReturn(candles: ETFCandle[], daysAgo: number): number | null {
  if (candles.length < 2) return null
  const current = candles[candles.length - 1].close
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)
  const past = candles.find(c => c.date >= cutoff)
  if (!past || past === candles[candles.length - 1]) return null
  return ((current - past.close) / past.close) * 100
}

function yearReturn(candles: ETFCandle[], year: number): number | null {
  const inYear = candles.filter(c => c.date.startsWith(`${year}-`))
  if (inYear.length < 2) return null
  return ((inYear[inYear.length - 1].close - inYear[0].close) / inYear[0].close) * 100
}

function RetBar({ value, maxAbs }: { value: number | null; maxAbs: number }) {
  if (value == null) return <span className="text-gray-300 text-sm">—</span>
  const pos = value >= 0
  const w = Math.min(100, (Math.abs(value) / Math.max(maxAbs, 1)) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex">
        <div className="flex-1 flex justify-end pr-1">
          {!pos && <div className="h-4 rounded-l" style={{ width: `${w}%`, backgroundColor: '#EF4444' }} />}
        </div>
        <div className="w-px bg-gray-200" />
        <div className="flex-1 pl-1">
          {pos && <div className="h-4 rounded-r" style={{ width: `${w}%`, backgroundColor: '#1D9E75' }} />}
        </div>
      </div>
      <span className={`text-sm font-semibold w-16 text-right ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
        {pos ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  )
}

function RenditePanel({ ticker }: { ticker: string }) {
  const { data: candles, isLoading } = useETFChart(ticker, '5y')

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
  if (!candles?.length) return <div className="text-sm text-gray-400 py-8 text-center">Keine Renditedaten</div>

  const periods = [
    { label: '1 Monat', days: 30 }, { label: '3 Monate', days: 90 },
    { label: '6 Monate', days: 180 }, { label: '1 Jahr', days: 365 },
    { label: '2 Jahre', days: 730 }, { label: '3 Jahre', days: 1095 },
    { label: '5 Jahre', days: 1825 },
  ]
  const currentYear = new Date().getFullYear()
  const periodRows = periods.map(p => ({ label: p.label, ret: periodReturn(candles, p.days) }))
  const calRows = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i)
    .map(y => ({ year: y, ret: yearReturn(candles, y) }))
    .filter(r => r.ret !== null)
  const maxAbs = Math.max(...[...periodRows, ...calRows].map(r => Math.abs(r.ret ?? 0)), 1)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-xero-border p-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">Zeitraum-Renditen</p>
        <div className="space-y-2.5">
          {periodRows.map(r => (
            <div key={r.label} className="grid grid-cols-[130px_1fr] items-center gap-4">
              <span className="text-sm text-gray-500">{r.label}</span>
              <RetBar value={r.ret} maxAbs={maxAbs} />
            </div>
          ))}
        </div>
      </div>
      {calRows.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-xero-border p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Kalendarjahr-Renditen</p>
            <div className="space-y-2.5">
              {calRows.map(r => (
                <div key={r.year} className="grid grid-cols-[60px_1fr] items-center gap-4">
                  <span className="text-sm text-gray-500">{r.year}</span>
                  <RetBar value={r.ret} maxAbs={maxAbs} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-xero-border p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Jahresrenditen</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={calRows.map(r => ({ year: String(r.year), ret: r.ret ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Rendite']} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} />
                <Bar dataKey="ret" radius={[4, 4, 0, 0]}>
                  {calRows.map((r, i) => <Cell key={i} fill={(r.ret ?? 0) >= 0 ? '#1D9E75' : '#EF4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Basisinfo panel ───────────────────────────────────────────────────────────

function BasiInfoPanel({ snap }: { snap: ETFSnapshot }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Ticker',            value: snap.ticker },
    { label: 'Name',              value: snap.name },
    { label: 'ISIN',              value: snap.isin ?? '—' },
    { label: 'Währung',           value: snap.currency },
    { label: 'Fondsgesellschaft', value: snap.fundFamily ?? '—' },
    { label: 'Kategorie',         value: snap.category ?? '—' },
    { label: 'TER p.a.',          value: fmtTer(snap.ter) },
    { label: 'Ausschüttungsart',  value: snap.distribution ?? '—' },
    { label: 'Replikation',       value: snap.replicationMethod ?? '—' },
    { label: 'Auflagedatum',      value: snap.inception ?? '—' },
    { label: 'Fondsvolumen',      value: fmtAssets(snap.totalAssets) },
    { label: 'Beta (3J)',         value: fmtNum(snap.beta) },
    { label: 'Rendite p.a.',      value: fmtPct(snap.yield) },
    { label: 'YTD Return',        value: fmtPct(snap.ytdReturn) },
  ]
  return (
    <div className="bg-white rounded-xl border border-xero-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-6 py-2.5 text-gray-500 font-medium w-48">{r.label}</td>
              <td className="px-6 py-2.5 text-gray-900">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Zusammensetzung panel ─────────────────────────────────────────────────────

function ZusammensetzungPanel({ ticker }: { ticker: string }) {
  const { data, isLoading } = useETFComposition(ticker)
  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
  if (!data) return <div className="text-sm text-gray-400 py-8 text-center">Keine Daten</div>

  const SECTOR_COLORS = ['#1D9E75','#378ADD','#534AB7','#D85A30','#BA7517','#D4537E','#3B6D11','#888780','#0EA5E9','#6366F1']

  return (
    <div className="space-y-4">
      {data.topHoldings.length > 0 && (
        <div className="bg-white rounded-xl border border-xero-border p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top Holdings</p>
          <div className="space-y-2">
            {data.topHoldings.map(h => (
              <div key={h.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-48 truncate">{h.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-xero-green rounded-full" style={{ width: `${Math.min(100, h.weight)}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-600 w-12 text-right">{h.weight.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.sectors.length > 0 && (
        <div className="bg-white rounded-xl border border-xero-border p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Sektoren</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.sectors} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={140} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Anteil']} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {data.sectors.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.topHoldings.length === 0 && data.sectors.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Keine Zusammensetzungsdaten verfügbar</p>
      )}
    </div>
  )
}

// ── Risiko panel ──────────────────────────────────────────────────────────────

function RisikoPanel({ ticker }: { ticker: string }) {
  const { data, isLoading } = useETFRisk(ticker)
  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
  if (!data) return <div className="text-sm text-gray-400 py-8 text-center">Keine Risikodaten</div>

  const metrics = [
    { label: 'Beta',            value: fmtNum(data.beta),       desc: 'Volatilität relativ zum Index' },
    { label: 'Alpha',           value: fmtNum(data.alpha),      desc: 'Überrendite gegenüber Index' },
    { label: 'Sharpe Ratio',    value: fmtNum(data.sharpe),     desc: 'Rendite je Risikoeinheit' },
    { label: 'Treynor Ratio',   value: fmtNum(data.treynor),    desc: 'Rendite je Marktrisiko' },
    { label: 'R²',              value: fmtNum(data.r2),         desc: 'Bestimmtheitsmaß zum Index' },
    { label: 'Std. Abweichung', value: fmtTer(data.stdDev),     desc: 'Streuung der Monatsrenditen' },
    { label: 'Ø Jahresrendite', value: fmtPct(data.meanReturn), desc: 'Mittlere jährliche Rendite' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="bg-white rounded-xl border border-xero-border p-4">
          <p className="text-xs text-gray-400 mb-1">{m.label}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{m.value}</p>
          <p className="text-xs text-gray-400">{m.desc}</p>
        </div>
      ))}
    </div>
  )
}

// ── Sparplan panel ────────────────────────────────────────────────────────────

function SparplanPanel({ ticker, currency }: { ticker: string; currency: string }) {
  const [monthly, setMonthly] = useState(100)
  const [years, setYears]     = useState(10)
  const [rate, setRate]       = useState(7)

  const { chartData, finalValue, totalInvested } = useMemo(() => {
    const r = Math.pow(1 + rate / 100, 1 / 12) - 1
    const points: { year: number; invested: number; value: number }[] = []
    for (let yr = 0; yr <= years; yr++) {
      const months = yr * 12
      const invested = monthly * months
      const fv = r > 0 ? monthly * ((Math.pow(1 + r, months) - 1) / r) : monthly * months
      points.push({ year: yr, invested: Math.round(invested), value: Math.round(fv) })
    }
    const last = points[points.length - 1]
    return { chartData: points, finalValue: last.value, totalInvested: last.invested }
  }, [monthly, years, rate])

  const gain = finalValue - totalInvested

  return (
    <div className="bg-white rounded-xl border border-xero-border p-6">
      <p className="text-sm font-semibold text-gray-700 mb-4">Sparplan-Rechner — {ticker}</p>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {([
          { label: 'Monatliche Rate', value: monthly, min: 1, max: undefined, step: 1, unit: '€', set: setMonthly },
          { label: 'Laufzeit', value: years, min: 1, max: 50, step: 1, unit: 'Jahre', set: setYears },
          { label: 'Jährl. Rendite', value: rate, min: 0, max: 50, step: 0.5, unit: '%', set: setRate },
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
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Endwert', value: fmtPrice(finalValue, currency), color: 'text-xero-green' },
          { label: 'Eingezahlt', value: fmtPrice(totalInvested, currency), color: 'text-gray-900' },
          { label: 'Gewinn', value: fmtPrice(gain, currency), color: gain >= 0 ? 'text-emerald-600' : 'text-red-500' },
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
          <Tooltip formatter={(v: number, name: string) => [fmtPrice(v, currency), name === 'value' ? 'Depotwert' : 'Eingezahlt']} labelFormatter={l => `Jahr ${l}`} contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} />
          <Line type="monotone" dataKey="invested" stroke="#CBD5E1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="value" stroke="#1D9E75" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Compare panel ─────────────────────────────────────────────────────────────

function ComparePanel({ tickers }: { tickers: string[] }) {
  const [range, setRange] = useState<ChartRange>('1y')

  // Fixed-count hooks (always 3, nulled for missing)
  const snap0 = useETFSnapshot(tickers[0] ?? null)
  const snap1 = useETFSnapshot(tickers[1] ?? null)
  const snap2 = useETFSnapshot(tickers[2] ?? null)
  const chart0 = useETFChart(tickers[0] ?? null, range)
  const chart1 = useETFChart(tickers[1] ?? null, range)
  const chart2 = useETFChart(tickers[2] ?? null, range)

  const snapshots = [snap0.data, snap1.data, snap2.data].slice(0, tickers.length)
  const rawCharts = [chart0.data, chart1.data, chart2.data].slice(0, tickers.length)

  const normalizedData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {}
    tickers.forEach((t, i) => {
      const candles = rawCharts[i] ?? []
      if (!candles.length) return
      const base = candles[0].close
      candles.forEach(c => {
        if (!byDate[c.date]) byDate[c.date] = {}
        byDate[c.date][t] = Math.round((c.close / base) * 10000) / 100
      })
    })
    return Object.keys(byDate).sort().map(date => ({ date: date.slice(5), ...byDate[date] }))
  }, [tickers.join(','), chart0.data, chart1.data, chart2.data])

  const METRICS: { label: string; get: (s: ETFSnapshot) => string }[] = [
    { label: 'Kurs',              get: s => fmtPrice(s.price, s.currency) },
    { label: 'Tagesveränderung',  get: s => `${fmtPct(s.changePct)}` },
    { label: 'NAV',               get: s => s.nav ? fmtPrice(s.nav, s.currency) : '—' },
    { label: 'TER p.a.',          get: s => fmtTer(s.ter) },
    { label: 'Rendite p.a.',      get: s => fmtPct(s.yield) },
    { label: 'YTD Return',        get: s => fmtPct(s.ytdReturn) },
    { label: 'Beta',              get: s => fmtNum(s.beta) },
    { label: 'Fondsvolumen',      get: s => fmtAssets(s.totalAssets) },
    { label: '52W Hoch',          get: s => fmtPrice(s.high52w, s.currency) },
    { label: '52W Tief',          get: s => fmtPrice(s.low52w, s.currency) },
    { label: 'Fondsgesellschaft', get: s => s.fundFamily ?? '—' },
    { label: 'Auflagedatum',      get: s => s.inception ?? '—' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Vergleich</h2>
        <div className="flex gap-2">
          {tickers.map((t, i) => (
            <span key={t} className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: COMPARE_COLORS[i] }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Normalized chart */}
      <div className="bg-white rounded-xl border border-xero-border p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Kursvergleich (Basis 100)</p>
          <div className="flex gap-1">
            {CHART_RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${range === r ? 'bg-xero-green text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={normalizedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E8EBF0', fontSize: 12 }} formatter={(v: number, name: string) => [`${v.toFixed(2)}`, name]} />
            {tickers.map((t, i) => (
              <Line key={t} type="monotone" dataKey={t} stroke={COMPARE_COLORS[i]} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3 justify-center flex-wrap">
          {tickers.map((t, i) => (
            <div key={t} className="flex items-center gap-2">
              <div className="w-8 h-0.5 rounded" style={{ backgroundColor: COMPARE_COLORS[i] }} />
              <span className="text-xs font-mono font-semibold text-gray-700">{t}</span>
              {snapshots[i] && <span className="text-xs text-gray-400">{snapshots[i]!.name.slice(0, 28)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics table */}
      <div className="bg-white rounded-xl border border-xero-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-xero-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Kennzahl</th>
              {tickers.map((t, i) => (
                <th key={t} className="px-5 py-3 text-left">
                  <span className="text-xs font-bold font-mono" style={{ color: COMPARE_COLORS[i] }}>{t}</span>
                  {snapshots[i] && (
                    <span className="block text-xs text-gray-400 font-normal truncate max-w-[160px]">{snapshots[i]!.name}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric, ri) => (
              <tr key={metric.label} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-5 py-2.5 text-gray-500 font-medium">{metric.label}</td>
                {tickers.map((t, i) => (
                  <td key={t} className="px-5 py-2.5 text-gray-900">
                    {snapshots[i] ? metric.get(snapshots[i]!) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Detail panel (single scrolling page) ──────────────────────────────────────

function ETFDetailPanel({ ticker, onRemove }: { ticker: string; onRemove: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const { data: snap, isLoading, error } = useETFSnapshot(ticker)
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Partial<Record<SubTab, HTMLDivElement>>>({})
  const [activeSection, setActiveSection] = useState<SubTab>('overview')

  useEffect(() => {
    const container = containerRef.current
    if (!container || !snap) return
    const handle = () => {
      const containerTop = container.getBoundingClientRect().top
      let active: SubTab = 'overview'
      for (const t of SUB_TABS) {
        const el = sectionRefs.current[t.id]
        if (!el) continue
        if (el.getBoundingClientRect().top - containerTop <= 60) active = t.id
      }
      setActiveSection(active)
    }
    container.addEventListener('scroll', handle, { passive: true })
    return () => container.removeEventListener('scroll', handle)
  }, [snap])

  function scrollTo(id: SubTab) {
    const el = sectionRefs.current[id]
    const container = containerRef.current
    if (!el || !container) return
    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }

  function sectionRef(id: SubTab) {
    return (el: HTMLDivElement | null) => { if (el) sectionRefs.current[id] = el }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-xero-border flex-shrink-0">
        <div>
          <span className="text-lg font-bold text-gray-900">{ticker}</span>
          {snap && <span className="ml-2 text-sm text-gray-400">{snap.name}</span>}
        </div>
        <button onClick={() => setConfirmRemove(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
          Remove
        </button>
        {confirmRemove && (
          <ConfirmDialog
            message={`${ticker} will be removed from your watchlist.`}
            confirmLabel="Remove"
            onConfirm={() => { setConfirmRemove(false); onRemove() }}
            onCancel={() => setConfirmRemove(false)}
          />
        )}
      </div>

      {/* Anchor nav — outside scroll area so it doesn't affect scroll calculations */}
      <div className="bg-white border-b border-xero-border flex overflow-x-auto flex-shrink-0">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => scrollTo(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0 ${
              activeSection === t.id ? 'border-xero-green text-xero-green' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-red-600 mb-2">Ticker nicht gefunden: {ticker}</p>
            <p className="text-xs text-red-400 mb-2">Europäische ETFs benötigen ein Börsenkürzel. Probiere:</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {[`${ticker.split('.')[0]}.DE`, `${ticker.split('.')[0]}.L`, `${ticker.split('.')[0]}.MI`, `${ticker.split('.')[0]}.PA`].map(s => (
                <span key={s} className="font-mono text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {isLoading && <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>}

        {/* Single page — all sections */}
        {snap && !error && (
          <div className="p-6 space-y-10">
            <div ref={sectionRef('overview')}>
              <SectionHeader>Overview</SectionHeader>
              <OverviewPanel snap={snap} />
            </div>
            <div ref={sectionRef('chart')}>
              <SectionHeader>Chart</SectionHeader>
              <ChartPanel ticker={ticker} currency={snap.currency} />
            </div>
            <div ref={sectionRef('rendite')}>
              <SectionHeader>Rendite</SectionHeader>
              <RenditePanel ticker={ticker} />
            </div>
            <div ref={sectionRef('basisinfo')}>
              <SectionHeader>Basisinfo</SectionHeader>
              <BasiInfoPanel snap={snap} />
            </div>
            <div ref={sectionRef('zusammensetzung')}>
              <SectionHeader>Zusammensetzung</SectionHeader>
              <ZusammensetzungPanel ticker={ticker} />
            </div>
            <div ref={sectionRef('risiko')}>
              <SectionHeader>Risiko</SectionHeader>
              <RisikoPanel ticker={ticker} />
            </div>
            <div ref={sectionRef('sparplan')} className="pb-16">
              <SectionHeader>Sparplan</SectionHeader>
              <SparplanPanel ticker={ticker} currency={snap.currency} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ETFTab ───────────────────────────────────────────────────────────────

export function ETFTab() {
  const [selected, setSelected] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set())
  const { tickers, add, remove } = useETFWatchlist()

  function handleSelect(ticker: string) { setSelected(ticker) }

  function handleRemove(ticker: string) {
    remove(ticker)
    if (selected === ticker) setSelected(tickers.find(t => t !== ticker) ?? null)
  }

  function toggleCompare(ticker: string) {
    setCompareSet(prev => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else if (next.size < 3) next.add(ticker)
      return next
    })
  }

  function toggleCompareMode() {
    setCompareMode(m => !m)
    setCompareSet(new Set())
  }

  const compareList = Array.from(compareSet)

  return (
    <div className="flex h-full min-h-0">
      {/* Watchlist sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-xero-border bg-white flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Watchlist</p>
          <button onClick={toggleCompareMode}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              compareMode ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}>
            {compareMode ? `${compareList.length}/3 ✓` : 'Vergleich'}
          </button>
        </div>
        <AddTickerPanel onAdd={add} />
        <div className="flex-1 overflow-y-auto">
          {tickers.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 px-4">Noch keine ETFs. Ticker oben eingeben.</p>
          )}
          {tickers.map(t => (
            <WatchlistRow
              key={t} ticker={t}
              selected={!compareMode && selected === t}
              onClick={() => !compareMode && handleSelect(t)}
              compareMode={compareMode}
              inCompare={compareSet.has(t)}
              onToggleCompare={() => toggleCompare(t)}
            />
          ))}
        </div>
        {compareMode && compareList.length >= 2 && (
          <div className="p-3 border-t border-gray-100">
            <div className="text-xs text-center text-gray-400 mb-2">
              {compareList.length === 3 ? 'Maximum erreicht' : `Noch ${3 - compareList.length} wählbar`}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {compareMode
        ? compareList.length >= 2
          ? <ComparePanel tickers={compareList} />
          : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">⇄</p>
                <p className="font-medium text-gray-600 mb-1">ETFs für Vergleich wählen</p>
                <p>Mindestens 2 ETFs aus der Watchlist anklicken</p>
              </div>
            </div>
          )
        : selected
          ? <ETFDetailPanel ticker={selected} onRemove={() => handleRemove(selected)} />
          : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">◈</p>
                <p className="font-medium text-gray-600 mb-1">ETF auswählen</p>
                <p>Ticker in der Watchlist hinzufügen und anklicken</p>
              </div>
            </div>
          )
      }
    </div>
  )
}
