import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { useReadingStats } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { useDarkMode } from '../../../hooks/useDarkMode'
import { weaknessLabel } from './shared'
import { formatDate } from '../../../utils/format'
import { IconChevronLeft } from '../../../lib/icons'

export function ProgressView() {
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { stats, isLoading } = useReadingStats()
  const gridColor = dark ? '#334155' : '#E8EBF0'
  const axisColor = dark ? '#64748B' : '#9CA3AF'

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <Link to="/learn/reading" className="inline-flex items-center gap-1 py-2 px-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
        <IconChevronLeft className="w-3 h-3" strokeWidth={2.5} /> {t.readingBackToSessions}
      </Link>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t.readingProgressLink}</h1>

      {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">…</p>}

      {stats && stats.totalSessions === 0 && (
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-12">{t.readingProgressEmpty}</p>
      )}

      {stats && stats.totalSessions > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: t.readingStatTotal, value: stats.totalSessions },
              { label: t.readingStatAvgScore, value: stats.avgScore != null ? `${stats.avgScore.toFixed(1)}/25` : '—' },
              { label: t.readingStatLatest, value: stats.latestScore != null ? `${stats.latestScore}/25` : '—' },
              { label: t.readingStatBest, value: stats.bestScore != null ? `${stats.bestScore}/25` : '—' },
              { label: t.readingStatAvgTime, value: stats.avgReadingTimeSec != null ? `${Math.round(stats.avgReadingTimeSec / 60)} min` : '—' },
            ].map(k => (
              <div key={k.label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{k.label}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{k.value}</p>
              </div>
            ))}
          </div>

          {stats.scoreTrend.length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-xero-border dark:border-slate-700 p-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">{t.readingScoreTrend}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => formatDate(v)} />
                  <YAxis domain={[0, 25]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}/25`, t.readingScoreTrend]}
                    labelFormatter={l => formatDate(l as string)}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${gridColor}`, fontSize: 12, backgroundColor: dark ? '#1E293B' : '#ffffff', color: dark ? '#F1F5F9' : '#111827' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {stats.mostCommonWeakness && (
            <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{t.readingMostCommonWeakness}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{weaknessLabel(t, stats.mostCommonWeakness)}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
