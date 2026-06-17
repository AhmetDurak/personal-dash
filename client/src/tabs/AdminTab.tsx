import { useState } from 'react'
import useSWR from 'swr'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'

const ADMIN_EMAIL = 'durakahmet049@gmail.com'

interface Stats {
  overview: {
    totalViews: number; uniqueVisitors: number
    avgDurationMs: number; bounceRate: number; activeNow: number
  }
  timeline: { date: string; views: number; visitors: number }[]
  pages:    { page: string; views: number; visitors: number; avgDurationMs: number }[]
  devices:  { device: string; count: number }[]
  browsers: { browser: string; count: number }[]
  os:       { os: string; count: number }[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<Stats>

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function pct(n: number): string { return `${Math.round(n * 100)}%` }

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#13B5EA', mobile: '#34D399', tablet: '#CBA6F7',
}

const PERIODS = [
  { label: '24h', days: 1 },
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-xero-navy rounded-xl p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function AdminTab({ userEmail }: { userEmail: string }) {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useSWR<Stats>(`/api/analytics/stats?days=${days}`, fetcher, { refreshInterval: 30000 })

  if (userEmail !== ADMIN_EMAIL) {
    return <div className="flex items-center justify-center h-full text-gray-400">Access denied</div>
  }

  const s = data

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            <p className="text-xs text-gray-400 mt-0.5">Personal Dashboard usage stats</p>
          </div>
          <div className="flex items-center gap-2">
            {s && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">{s.overview.activeNow} live</span>
              </div>
            )}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {PERIODS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    days === p.days ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && !s && (
          <div className="flex items-center justify-center py-20 text-gray-500">Loading…</div>
        )}

        {s && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Page Views"      value={s.overview.totalViews.toLocaleString()} />
              <StatCard label="Unique Visitors" value={s.overview.uniqueVisitors.toLocaleString()} />
              <StatCard label="Avg Duration"    value={fmt(s.overview.avgDurationMs)} />
              <StatCard label="Bounce Rate"     value={pct(s.overview.bounceRate)} sub="single-page sessions" />
            </div>

            {/* Timeline chart */}
            <div className="bg-xero-navy rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-200 mb-4">Views over time</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={s.timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gViews"    x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#13B5EA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#13B5EA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34D399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="views"    stroke="#13B5EA" strokeWidth={2} fill="url(#gViews)"    name="Views" />
                  <Area type="monotone" dataKey="visitors" stroke="#34D399" strokeWidth={2} fill="url(#gVisitors)" name="Visitors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top pages + Devices */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* Top pages */}
              <div className="bg-xero-navy rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-200 mb-3">Top pages</p>
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-gray-500 uppercase tracking-wider px-2 mb-2">
                    <span>Page</span><span>Views</span><span>Visitors</span><span>Avg time</span>
                  </div>
                  {s.pages.slice(0, 10).map(p => (
                    <div key={p.page} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm">
                      <span className="text-gray-300 truncate font-mono text-xs">{p.page}</span>
                      <span className="text-white font-medium tabular-nums">{p.views}</span>
                      <span className="text-gray-400 tabular-nums">{p.visitors}</span>
                      <span className="text-gray-500 tabular-nums text-xs">{fmt(p.avgDurationMs)}</span>
                    </div>
                  ))}
                  {s.pages.length === 0 && <p className="text-gray-500 text-sm px-2">No data yet</p>}
                </div>
              </div>

              {/* Devices */}
              <div className="bg-xero-navy rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-200 mb-3">Devices</p>
                  {s.devices.length > 0 ? (
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={s.devices} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="device" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} width={64} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Sessions">
                          {s.devices.map(d => <Cell key={d.device} fill={DEVICE_COLORS[d.device] ?? '#7AA2F7'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-gray-500 text-sm">No data yet</p>}
                </div>

                {/* Browsers */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Browsers</p>
                  <div className="space-y-1.5">
                    {s.browsers.map(b => {
                      const total = s.browsers.reduce((a, x) => a + x.count, 0)
                      return (
                        <div key={b.browser} className="flex items-center gap-2">
                          <span className="text-xs text-gray-300 w-16 flex-shrink-0">{b.browser}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-xero-green" style={{ width: `${(b.count / total) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">{b.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* OS */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Operating Systems</p>
                  <div className="space-y-1.5">
                    {s.os.map(o => {
                      const total = s.os.reduce((a, x) => a + x.count, 0)
                      return (
                        <div key={o.os} className="flex items-center gap-2">
                          <span className="text-xs text-gray-300 w-16 flex-shrink-0">{o.os}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${(o.count / total) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">{o.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
