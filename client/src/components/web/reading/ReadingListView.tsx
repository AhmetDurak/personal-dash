import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReadingSessions, useReadingStats, type ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { ConfirmDialog } from '../ConfirmDialog'
import { IconAdd, IconDelete, IconReading } from '../../../lib/icons'
import { formatDate } from '../../../utils/format'

function SessionCard({ session, onDeleteClick }: { session: ReadingSession; onDeleteClick: () => void }) {
  const { t } = useLanguage()
  const isCompleted = session.status === 'completed'

  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4">
      <Link to={`/learn/reading/${session.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-3 py-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{session.title}</p>
            {isCompleted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-xero-green/10 text-xero-green flex-shrink-0">
                {session.totalScore}/25
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-slate-500">
            {session.category && <span>{session.category}</span>}
            <span>{formatDate(session.createdAt)}</span>
            {!isCompleted && <span className="text-amber-500 font-medium">{t.readingInProgress}</span>}
          </div>
        </div>
        <span className="text-xs font-medium text-xero-green flex-shrink-0">
          {isCompleted ? t.readingView : t.readingContinue}
        </span>
      </Link>
      <button onClick={onDeleteClick} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
        <IconDelete className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

export function ReadingListView() {
  const { t } = useLanguage()
  const { sessions, isLoading, removeSession } = useReadingSessions()
  const { stats } = useReadingStats()
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const deleting = sessions.find(s => s.id === confirmDeleteId) ?? null

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t.reading}</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/learn/reading/progress"
            className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-3 py-2.5 min-h-[40px] flex items-center transition-colors"
          >
            {t.readingProgressLink}
          </Link>
          <Link
            to="/learn/reading/new"
            className="flex items-center gap-1.5 text-xs bg-xero-green text-white px-3 py-2 rounded-xl font-medium hover:bg-xero-green-dark transition-colors min-h-[40px]"
          >
            <IconAdd className="w-3.5 h-3.5" strokeWidth={2.5} />
            {t.readingNewSession}
          </Link>
        </div>
      </div>

      {stats && stats.totalSessions > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t.readingStatTotal, value: stats.totalSessions },
            { label: t.readingStatAvgScore, value: stats.avgScore != null ? `${stats.avgScore.toFixed(1)}/25` : '—' },
            { label: t.readingStatBest, value: stats.bestScore != null ? `${stats.bestScore}/25` : '—' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{k.label}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">…</p>}

      <div className="space-y-3">
        {sessions.map(s => (
          <SessionCard key={s.id} session={s} onDeleteClick={() => setConfirmDeleteId(s.id)} />
        ))}
      </div>

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-14">
          <IconReading className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{t.readingEmptyTitle}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">{t.readingEmptyHint}</p>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`"${deleting.title}" will be deleted.`}
          confirmLabel={t.delete}
          onConfirm={() => { removeSession(deleting.id); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
