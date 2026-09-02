import { useState, useEffect, useRef } from 'react'
import type { ReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'

function reconstructSummary(session: Pick<ReadingSession,
  'summaryMainIdea' | 'summaryPoint1' | 'summaryPoint2' | 'summaryPoint3' | 'summaryImportance' | 'summaryExample'>) {
  return [
    session.summaryMainIdea,
    session.summaryPoint1 && `• ${session.summaryPoint1}`,
    session.summaryPoint2 && `• ${session.summaryPoint2}`,
    session.summaryPoint3 && `• ${session.summaryPoint3}`,
    session.summaryImportance,
    session.summaryExample,
  ].filter(Boolean).join('\n\n')
}

export function ImproveStage({ session, onSave, onContinue }: {
  session: Pick<ReadingSession, 'id' | 'summaryMainIdea' | 'summaryPoint1' | 'summaryPoint2' | 'summaryPoint3' | 'summaryImportance' | 'summaryExample' | 'improvedSummary'>
  onSave: (improvedSummary: string) => void
  onContinue: () => void
}) {
  const { t } = useLanguage()
  const original = reconstructSummary(session)
  const [improved, setImproved] = useState(session.improvedSummary ?? '')
  const sessionIdRef = useRef(session.id)

  useEffect(() => {
    if (sessionIdRef.current !== session.id) {
      sessionIdRef.current = session.id
      setImproved(session.improvedSummary ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  function update(value: string) {
    setImproved(value)
    onSave(value)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.readingImproveInstruction}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">{t.readingOriginalSummaryLabel}</p>
          <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{original}</p>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-xero-green mb-2">{t.readingImprovedSummaryLabel}</p>
          <textarea
            value={improved}
            onChange={e => update(e.target.value)}
            rows={8}
            className="w-full text-sm border-0 p-0 bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 rounded-md resize-none"
            placeholder={t.readingImprovedPlaceholder}
          />
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark transition-colors"
      >
        {t.readingContinueToReflection}
      </button>
    </div>
  )
}
