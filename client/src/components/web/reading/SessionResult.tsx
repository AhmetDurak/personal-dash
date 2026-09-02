import { Link } from 'react-router-dom'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { weaknessLabel, scoreBand, scoreBandLabel } from './shared'

export function SessionResult({ session }: { session: ReadingSession }) {
  const { t } = useLanguage()
  const total = session.totalScore ?? 0
  const band = scoreBand(total)
  const readingMin = session.readingTimeSec != null ? Math.round(session.readingTimeSec / 60) : null

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="text-center py-4">
        <p className="text-4xl mb-2">✓</p>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{session.title}</h1>
        {session.category && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{session.category}</p>}
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-6 text-center">
        <p className="text-3xl font-bold text-xero-green">{total} / 25</p>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">{scoreBandLabel(t, band)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t.readingResultReadingTime, value: readingMin != null ? `${readingMin} min` : '—' },
          { label: t.readingResultWordCount, value: session.summaryWordCount ?? '—' },
          { label: t.readingResultWeakness, value: weaknessLabel(t, session.biggestWeakness) },
          { label: t.readingExplain2minLabel, value: session.canExplain2min ? t.readingYes : t.readingNotYet },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{k.label}</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{String(k.value)}</p>
          </div>
        ))}
      </div>

      {session.improvedSummary && (
        <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">{t.readingImprovedSummaryLabel}</p>
          <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{session.improvedSummary}</p>
        </div>
      )}

      {session.takeaway && (
        <div className="rounded-2xl border border-xero-green/30 bg-xero-green/5 p-4">
          <p className="text-xs font-semibold text-xero-green mb-1">{t.readingTakeawayLabel}</p>
          <p className="text-sm text-gray-700 dark:text-slate-300 italic">"{session.takeaway}"</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Link to="/learn/reading" className="flex-1 text-center py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          {t.readingBackToSessions}
        </Link>
        <Link to="/learn/reading/new" className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl bg-xero-green text-white hover:bg-xero-green-dark transition-colors">
          {t.readingNewSession}
        </Link>
      </div>
    </div>
  )
}
