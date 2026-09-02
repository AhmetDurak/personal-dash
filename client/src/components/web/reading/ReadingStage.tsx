import { useState, useEffect } from 'react'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

export function ReadingStage({ session, onReady }: { session: ReadingSession; onReady: () => void }) {
  const { t } = useLanguage()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(session.readingStartedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.readingStartedAt])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{session.title}</h1>
          {session.category && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-slate-500">{session.category}</span>
          )}
        </div>
        <span className="text-xs font-mono text-gray-400 dark:text-slate-500 tabular-nums flex-shrink-0 pt-1">{mm}:{ss}</span>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-6">
        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{session.sourceContent}</p>
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500 text-center">{t.readingFocusHint}</p>

      <button
        onClick={onReady}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingReadyButton}
      </button>
    </div>
  )
}
